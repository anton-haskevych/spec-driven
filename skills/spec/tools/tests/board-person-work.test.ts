import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { personWork } from "../board/person-work";
import type { HeldClaim } from "../claims/rules";
import { NOW, boardInputs, prRow, specFixture } from "./board-factories";
import { heldClaim, liveSession, phaseState } from "./factories";

const ME = "spec-tests";
const open = (id: string, needs: string[] = []) => phaseState({ id, edges: { declared: true, needs, needsDeployed: [], sameFilesAs: [] } });
const done = (id: string) => phaseState({ id, done: true, edges: { declared: true, needs: [], needsDeployed: [], sameFilesAs: [] } });
const owned = (name: string, owner: string, phases = [open("1")], status = "active") => specFixture(name, { phases, status, meta: { owner, ...(owner === "?" ? { ownerInvalid: true as const } : {}) }, reviewed: true });
const remote = (spec: string, phase: string, user: string): HeldClaim => ({ ...heldClaim("remote", { spec, phase, sessionId: `${spec}-${phase}` }), holder: { user, host: "thinkpad" } });

describe("personWork", () => {
  const specs = [
    owned("cross-studio", "Taras Korpach"),
    owned("staff-ios", "taras", [done("1"), open("2"), open("3", ["2"])]),
    owned("gift-cards", "taras", [done("1")], "done"),
    owned("mine", ME),
    owned("typo", "?"),
    specFixture("shared", { phases: [open("1")], reviewed: true }),
  ];
  const inputs = boardInputs(specs, {
    claims: [remote("staff-ios", "2", "taraskorpach"), remote("staff-ios", "1", "taraskorpach"), remote("shared", "1", ME), heldClaim("live", { spec: "mine", phase: "1" }), heldClaim("done", { spec: "mine", phase: "0" })],
    prs: { ok: true, value: [prRow({ number: 812, branch: "feat/staff-ios-pr-b", author: "taraskorpach" }), prRow({ number: 5, state: "MERGED", author: "taras" }), prRow({ number: 9, author: ME })] },
    sessions: { ok: true, value: [liveSession({ sessionId: "s1", name: "mine execute 1", cwd: "/repo" }), liveSession({ sessionId: "s2", cwd: "/elsewhere" })] },
    worktreePaths: ["/repo"],
  });
  const board = buildBoard(inputs, NOW, ME);

  test("owns every spec the person owns, any lane, finished ones last with how they ended", () => {
    const work = personWork(inputs, board, "taras");
    expect(work.owns.map(({ spec, now }) => [spec, now.kind])).toEqual([
      ["cross-studio", "ready"],
      ["staff-ios", "flight"],
      ["gift-cards", "finished"],
    ]);
    expect(work.owns.at(-1)?.now).toEqual({ kind: "finished", status: "done" });
    expect(work.mine).toBe(false);
  });

  test("on now: their remote claims, minus phases done on base; PRs: their open ones on any spec", () => {
    const work = personWork(inputs, board, "taras");
    expect(work.onNow).toEqual([{ spec: "staff-ios", phase: "2", since: "2026-10-01T20:00:00.000Z", host: "thinkpad" }]);
    expect(work.prs.map((pr) => [pr.branch, pr.cell.number])).toEqual([["feat/staff-ios-pr-b", 812]]);
    expect(work).not.toHaveProperty("sessions");
  });

  test("me: my remote and live local claims, and this repo's sessions on this machine", () => {
    const work = personWork(inputs, board, "me");
    expect(work.person).toBe(ME);
    expect(work.mine).toBe(true);
    expect(work.owns.map((spec) => spec.spec)).toEqual(["mine"]);
    expect(work.onNow.map(({ spec, phase, host }) => [spec, phase, host])).toEqual([
      ["shared", "1", "thinkpad"],
      ["mine", "1", undefined],
    ]);
    expect(work.sessions?.map(({ spec, sub, phase }) => [spec, sub, phase])).toEqual([["mine", "execute", "1"]]);
  });

  test("a malformed owner is nobody's; a stranger has nothing", () => {
    expect(personWork(inputs, board, "bob")).toEqual({ person: "bob", mine: false, owns: [], onNow: [], prs: [] });
  });

  test("--local: owns only, marked local", () => {
    const local = boardInputs(specs, { claims: [remote("staff-ios", "2", "taras")] });
    const work = personWork(local, buildBoard(local, NOW, ME), "taras");
    expect(work.local).toBe(true);
    expect(work.owns).toHaveLength(3);
    expect(personWork(local, buildBoard(local, NOW, ME), "me")).not.toHaveProperty("sessions");
  });
});
