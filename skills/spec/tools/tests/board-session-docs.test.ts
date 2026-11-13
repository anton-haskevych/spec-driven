import { describe, expect, test } from "bun:test";
import { attributeSessions } from "../board/attribution";
import type { BoardInputs, HeldClaim } from "../board/inputs";
import { buildBoard } from "../board/lanes";
import type { FocusRow } from "../board/model";
import { renderBoard } from "../board/render";
import { CLAUDE_CODE_SOURCE, type SessionDoc } from "../sessions/session-doc";
import { boardInputs, NOW, specFixture } from "./board-factories";
import { heldClaim, liveSession, phaseEdges, phaseState } from "./factories";
import { sessionDoc } from "./record-factories";

const phase = (id: string) => phaseState({ id, edges: phaseEdges({ declared: true, needs: [] }) });
const focused = (name: string) => specFixture(name, { phases: [phase("1"), phase("2")], meta: { focus: "must" } });
const ALPHA = focused("alpha");
const BETA = focused("beta");
const doc = (id: string, overrides: Partial<SessionDoc> = {}): SessionDoc => sessionDoc({ ref: { source: CLAUDE_CODE_SOURCE, id }, host: "desktop", who: "Taras Korpach", lastWriteAt: "2026-10-01T19:45:00Z", ...overrides });
const remoteClaim = (sessionId: string, phase: string, spec = "alpha"): HeldClaim => ({ ...heldClaim("remote", { spec, phase, sessionId, claimedAt: "2026-10-01T19:00:00.000Z" }), holder: { user: "Taras Korpach", host: "desktop" } });
const inputsWith = (overrides: Partial<BoardInputs> = {}) => boardInputs([ALPHA, BETA], { thisHost: "laptop", worktreePaths: ["/repo"], ...overrides });
const rowOf = (inputs: BoardInputs, spec = "alpha"): FocusRow => buildBoard(inputs, NOW).lanes.focus.find((row) => row.spec === spec) as FocusRow;

describe("attribution by session document", () => {
  const live = liveSession({ sessionId: "s1", cwd: "/repo" });
  const focus = new Set(["alpha", "beta"]);

  test("a review session no claim holds is placed on the spec it registered", () => {
    const { bySpec } = attributeSessions([live], inputsWith({ sessionDocs: [doc("s1", { spec: "beta", mode: "review", host: "laptop" })] }), focus);
    expect(bySpec.get("beta")?.map((session) => session.sessionId)).toEqual(["s1"]);
  });

  test("a claim still decides first", () => {
    const claims = [heldClaim("live", { spec: "alpha", phase: "1", sessionId: "s1" })];
    const { bySpec } = attributeSessions([live], inputsWith({ claims, sessionDocs: [doc("s1", { spec: "beta" })] }), focus);
    expect([...bySpec.keys()]).toEqual(["alpha"]);
  });
});

describe("this machine's sessions on a focus row", () => {
  test("carry the mode from their document and the phase from their claim", () => {
    const claims = [heldClaim("live", { spec: "alpha", phase: "2", sessionId: "s1" })];
    const inputs = inputsWith({ claims, sessions: { ok: true, value: [liveSession({ sessionId: "s1", cwd: "/repo" })] }, sessionDocs: [doc("s1", { spec: "alpha", mode: "execute", host: "laptop" })] });
    expect(rowOf(inputs).sessions).toMatchObject([{ sub: "execute", phase: "2", status: "idle" }]);
  });
});

describe("other machines' sessions on a focus row", () => {
  test("come from their documents, by person, with the phase their claim names", () => {
    const inputs = inputsWith({ sessionDocs: [doc("t1", { spec: "alpha", mode: "execute", tree: "alpha-pr-b" })], claims: [remoteClaim("t1", "2")] });
    expect(rowOf(inputs).work).toEqual([{ person: "taraskorpach", mine: false, claims: [], prs: [], sessions: [{ mode: "execute", host: "desktop", tree: "alpha-pr-b", phase: "2", since: "2026-10-01T19:45:00Z" }] }]);
  });

  test("a claim a document explains is not shown twice; one with no document still is", () => {
    const inputs = inputsWith({ sessionDocs: [doc("t1", { spec: "alpha" })], claims: [remoteClaim("t1", "2"), remoteClaim("t9", "1")] });
    expect(rowOf(inputs).work[0]?.claims.map((claim) => claim.phase)).toEqual(["1"]);
  });

  test("a document with no spec, another spec, or this machine's own session is left out", () => {
    const inputs = inputsWith({
      sessions: { ok: true, value: [liveSession({ sessionId: "mine", cwd: "/repo" })] },
      sessionDocs: [doc("a", { spec: undefined }), doc("b", { spec: "beta" }), doc("mine", { spec: "alpha", host: "desktop" }), doc("ended", { spec: "alpha", host: "laptop" })],
    });
    expect(rowOf(inputs).work).toEqual([]);
  });

  test("a person's row prints their other-machine sessions", () => {
    const inputs = inputsWith({ sessionDocs: [doc("t1", { spec: "alpha", mode: "review" })] });
    const text = renderBoard(buildBoard(inputs, NOW), { lane: "focus" });
    expect(text).toContain("taraskorpach: review on desktop 15m");
  });
});
