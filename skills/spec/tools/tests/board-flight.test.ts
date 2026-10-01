import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import type { PhaseState } from "../core/spec-state";
import { boardInputs, NOW, specFixture, workspaceView, type SpecFixture } from "./board-factories";
import { phaseEdges, phaseState } from "./factories";

const open = (id: string, needs: string[] = [], extra: Partial<PhaseState> = {}) =>
  phaseState({ id, edges: phaseEdges({ declared: true, needs }), ...extra });
const done = (id: string, needs: string[] = []) => open(id, needs, { done: true });
const wip = (id: string, needs: string[] = []) => open(id, needs, { summary: { deliverables: { checked: 1, unchecked: 2 }, nextRun: [] } });
const alpha = (...phases: PhaseState[]) => specFixture("alpha", { phases });
const boardOf = (base: SpecFixture[], ...views: ReturnType<typeof workspaceView>[]) => buildBoard(boardInputs(base, { workspaces: views }), NOW);
const keys = (rows: ReadonlyArray<{ spec: string; phase?: string }>) => rows.map((row) => `${row.spec}#${row.phase ?? ""}`);

const BASE = alpha(done("1"), open("2", ["1"]), open("3", ["2"]), open("4", ["2"]));

describe("in-flight lane", () => {
  test("a phase ticked on a branch is in flight there and leaves ready", () => {
    const board = boardOf([BASE], workspaceView("/wt/a", [alpha(done("1"), done("2", ["1"]), open("3", ["2"]), open("4", ["2"]))]));
    expect(board.lanes.inFlight).toEqual([{ spec: "alpha", phase: "2", workspace: "/wt/a", target: { workspace: "/wt/a" }, next: "ticked on branch, not merged" }]);
    expect(keys(board.lanes.ready)).not.toContain("alpha#2");
  });

  test("a half-done phase is in flight and executing", () => {
    const board = boardOf([BASE], workspaceView("/wt/a", [alpha(done("1"), wip("2", ["1"]), open("3", ["2"]), open("4", ["2"]))]));
    expect(board.lanes.inFlight).toMatchObject([{ phase: "2", workspace: "/wt/a", next: "executing" }]);
  });

  test("the same phase ticked in two worktrees is one row naming both", () => {
    const ticked = alpha(done("1"), done("2", ["1"]), open("3", ["2"]), open("4", ["2"]));
    const board = boardOf([BASE], workspaceView("/wt/a", [ticked]), workspaceView("/wt/b", [ticked]));
    expect(board.lanes.inFlight).toMatchObject([{ phase: "2", workspace: "/wt/a", alsoIn: ["/wt/b"] }]);
  });

  test("a spec with every phase ticked on a branch stays on the board, in flight", () => {
    const all = alpha(done("1"), done("2", ["1"]), done("3", ["2"]), done("4", ["2"]));
    const board = boardOf([BASE], workspaceView("/wt/a", [all]));
    expect(keys(board.lanes.inFlight)).toEqual(["alpha#2", "alpha#3", "alpha#4"]);
    expect(board.lanes.ready).toEqual([]);
    expect(board.lanes.blocked).toEqual([]);
  });

  test("activity in a paused spec stays off the board", () => {
    const paused = specFixture("alpha", { phases: BASE.state.phases, status: "paused" });
    const board = boardOf([paused], workspaceView("/wt/a", [alpha(done("1"), done("2", ["1"]))]));
    expect(board.lanes.inFlight).toEqual([]);
  });
});

describe("ready in a workspace", () => {
  test("a dependent of a branch-only tick is ready in that workspace, never ★, others stay blocked", () => {
    const board = boardOf([BASE], workspaceView("/wt/a", [alpha(done("1"), done("2", ["1"]), open("3", ["2"]), open("4", ["2"]))]));
    const row = board.lanes.ready.find((candidate) => candidate.phase === "3");
    expect(row).toMatchObject({ target: { workspace: "/wt/a" }, readyIn: { workspace: "/wt/a", needs: ["2"] }, safe: false });
    expect(keys(board.lanes.blocked)).toEqual([]);
  });

  test("a dependent whose need is ticked in two worktrees stays blocked", () => {
    const ticked = alpha(done("1"), done("2", ["1"]), open("3", ["2"]), open("4", ["2"]));
    const board = boardOf([BASE], workspaceView("/wt/a", [ticked]), workspaceView("/wt/b", [ticked]));
    expect(keys(board.lanes.blocked)).toEqual(["alpha#3", "alpha#4"]);
  });

  test("a dependent that also needs its dependency deployed stays blocked", () => {
    const base = alpha(done("1"), open("2", ["1"]), open("3", ["2"], { edges: phaseEdges({ declared: true, needs: ["2"], needsDeployed: ["2"] }) }));
    const board = boardOf([base], workspaceView("/wt/a", [alpha(done("1"), done("2", ["1"]), open("3", ["2"]))]));
    expect(keys(board.lanes.blocked)).toEqual(["alpha#3"]);
  });
});

describe("specs only on a branch", () => {
  test("lands in ready and blocked with only-on and the workspace as target", () => {
    const fresh = specFixture("fresh", { phases: [open("1"), open("2", ["1"])] });
    const board = boardOf([BASE], workspaceView("/wt/fresh", [fresh], { branch: "feat/fresh", branchOnly: true }));
    expect(board.lanes.ready.find((row) => row.spec === "fresh")).toMatchObject({
      phase: "1",
      onlyOn: "feat/fresh",
      target: { workspace: "/wt/fresh" },
      safe: false,
    });
    expect(board.lanes.blocked.find((row) => row.spec === "fresh")).toEqual({ spec: "fresh", phase: "2", target: { workspace: "/wt/fresh" }, reasons: ["needs 1"] });
  });
});

describe("board facts", () => {
  test("carries the current checkout and the main checkout", () => {
    const board = buildBoard(boardInputs([BASE], { currentPath: "/wt/a", workspaces: [workspaceView("/repo", [], { isMain: true })] }), NOW);
    expect([board.here, board.mainCheckout]).toEqual(["/wt/a", "/repo"]);
  });
});
