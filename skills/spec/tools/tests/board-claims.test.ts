import { describe, expect, test } from "bun:test";
import type { HeldClaim } from "../claims/rules";
import { buildBoard } from "../board/lanes";
import { renderBoard } from "../board/render";
import type { ClaimStatus } from "../claims/rules";
import type { PhaseState } from "../core/spec-state";
import type { LiveSession } from "../sessions/live";
import { boardInputs, NOW, specFixture, workspaceView } from "./board-factories";
import { phaseEdges, phaseState } from "./factories";

const open = (id: string, extra: Partial<PhaseState> = {}) => phaseState({ id, edges: phaseEdges({ declared: true, needs: [] }), ...extra });
const ALPHA = specFixture("alpha", { phases: [open("1", { done: true }), open("2"), open("3")] });

function held(phase: string, status: ClaimStatus, overrides: Partial<HeldClaim["claim"]> = {}): HeldClaim {
  return { claim: { spec: "alpha", phase, sessionId: `s${phase}`, sessionName: `alpha execute ${phase}`, workspace: "/wt/a", claimedAt: "t", ...overrides }, status };
}

function session(sessionId: string, cwd: string): LiveSession {
  return { pid: 1, sessionId, cwd, status: "busy", updatedAt: new Date("2026-10-01T19:58:00Z"), procStart: "x" };
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

  test("a claim on a phase already in progress adds its holder to that row", () => {
    const wip = specFixture("alpha", { phases: [open("1", { done: true }), open("2", { summary: { deliverables: { checked: 1, unchecked: 1 }, nextRun: [] } }), open("3")] });
    const board = buildBoard(boardInputs([ALPHA], { claims: [held("2", "unknown")], workspaces: [workspaceView("/wt/a", [wip])] }), NOW);
    expect(board.lanes.inFlight).toEqual([{ spec: "alpha", phase: "2", workspace: "/wt/a", target: { workspace: "/wt/a" }, holder: "alpha execute 2", next: "executing" }]);
  });
});
