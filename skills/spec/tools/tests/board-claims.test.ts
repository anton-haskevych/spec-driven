import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { renderBoard } from "../board/render";
import type { ClaimStatus, HeldClaim } from "../claims/rules";
import type { Claim } from "../claims/store";
import type { LiveSession } from "../sessions/live";
import type { PhaseState } from "../core/spec-state";
import { boardInputs, NOW, specFixture, workspaceView } from "./board-factories";
import { heldClaim, liveSession, phaseEdges, phaseState } from "./factories";

const open = (id: string, extra: Partial<PhaseState> = {}) => phaseState({ id, edges: phaseEdges({ declared: true, needs: [] }), ...extra });
const ALPHA = specFixture("alpha", { phases: [open("1", { done: true }), open("2"), open("3")] });

function held(phase: string, status: ClaimStatus, overrides: Partial<Claim> = {}): HeldClaim {
  return heldClaim(status, { phase, sessionId: `s${phase}`, sessionName: `alpha execute ${phase}`, workspace: "/wt/a", claimedAt: "t", ...overrides });
}

function session(sessionId: string, cwd: string): LiveSession {
  return liveSession({ sessionId, cwd, status: "busy", updatedAt: new Date("2026-10-01T19:58:00Z") });
}

const boardWith = (claims: HeldClaim[], sessions: ReturnType<typeof boardInputs>["sessions"] = { ok: true, value: [] }) =>
  buildBoard(boardInputs([ALPHA], { claims, sessions, workspaces: [workspaceView("/wt/a", [])] }), NOW);

describe("claims on the board", () => {
  test("a claimed phase with nothing ticked yet is in flight with its holder and leaves ready", () => {
    const board = boardWith([held("2", "live")], { ok: true, value: [session("s2", "/repo")] });
    expect(board.lanes.inFlight).toEqual([
      { spec: "alpha", phase: "2", workspace: "/wt/a", target: { workspace: "/wt/a" }, holder: "alpha execute 2", session: { status: "busy", since: "2026-10-01T19:58:00.000Z" }, next: "executing" },
    ]);
    expect(board.lanes.ready.map((row) => row.phase)).toEqual(["3"]);
  });

  test("the claim's session wins over a session found by worktree path", () => {
    const sessions = { ok: true as const, value: [session("other", "/wt/a"), session("s2", "/elsewhere")] };
    expect(boardWith([held("2", "live")], sessions).lanes.inFlight[0]?.session).toEqual({ status: "busy", since: "2026-10-01T19:58:00.000Z" });
  });

  test("a closed claim shows its session closed and asks you to resume or release it", () => {
    const board = boardWith([held("2", "closed")]);
    expect(board.lanes.inFlight[0]).toMatchObject({ phase: "2", holder: "alpha execute 2", session: { status: "closed" } });
    expect(board.lanes.needsYou).toEqual([{ kind: "claim", spec: "alpha", phase: "2", holder: "alpha execute 2" }]);
    expect(renderBoard(board, { lane: "you" }).split("\n").slice(3)).toEqual(["NEEDS YOU", "  claim by a closed session  alpha · 2 → resume or release"]);
  });

  test("gone and done claims stay off the board", () => {
    const board = boardWith([held("2", "gone"), held("1", "done")]);
    expect(board.lanes.inFlight).toEqual([]);
    expect(board.lanes.needsYou).toEqual([]);
  });

  test("another machine's claim is in flight with user@host and its age, and leaves ready", () => {
    const theirs = { ...held("2", "remote", { claimedAt: "2026-10-01T17:00:00.000Z" }), holder: { user: "Taras", host: "desktop" } };
    const board = boardWith([theirs]);
    expect(board.lanes.inFlight).toEqual([
      { spec: "alpha", phase: "2", workspace: "", holder: "Taras@desktop (alpha execute 2)", session: { status: "remote", since: "2026-10-01T17:00:00.000Z" }, next: "executing" },
    ]);
    expect(board.lanes.ready.map((row) => row.phase)).toEqual(["3"]);
    expect(board.lanes.needsYou).toEqual([]);
    expect(renderBoard(board, { lane: "flight" }).split("\n").slice(3, 5)).toEqual(["IN FLIGHT", "  alpha · 2  Taras@desktop (alpha execute 2)  remote 3h  —  executing"]);
  });

  test("a remote claim older than REMOTE_CLAIM_STALE_DAYS needs you", () => {
    const theirs = { ...held("2", "remote", { claimedAt: "2026-09-27T20:00:00.000Z" }), holder: { user: "Taras", host: "desktop" } };
    const board = boardWith([theirs]);
    expect(board.lanes.needsYou).toEqual([{ kind: "remote-claim", spec: "alpha", phase: "2", holder: "Taras@desktop (alpha execute 2)", since: "2026-09-27T20:00:00.000Z" }]);
    expect(renderBoard(board, { lane: "you" }).split("\n").slice(3)).toEqual(["NEEDS YOU", "  remote claim 4d old  alpha · 2 → ask Taras@desktop (alpha execute 2) or take it over"]);
  });

  test("a remote claim keeps its cell when local sessions are unreadable", () => {
    const theirs = { ...held("2", "remote", { claimedAt: "2026-10-01T17:00:00.000Z" }), holder: { user: "Taras", host: "desktop" } };
    expect(boardWith([theirs], { ok: false, reason: "x" }).lanes.inFlight[0]?.session).toEqual({ status: "remote", since: "2026-10-01T17:00:00.000Z" });
  });

  test("a claim on a phase already in progress adds its holder to that row", () => {
    const wip = specFixture("alpha", { phases: [open("1", { done: true }), open("2", { summary: { deliverables: { checked: 1, unchecked: 1 }, nextRun: [] } }), open("3")] });
    const board = buildBoard(boardInputs([ALPHA], { claims: [held("2", "unknown")], workspaces: [workspaceView("/wt/a", [wip])] }), NOW);
    expect(board.lanes.inFlight).toEqual([{ spec: "alpha", phase: "2", workspace: "/wt/a", target: { workspace: "/wt/a" }, holder: "alpha execute 2", next: "executing" }]);
  });
});
