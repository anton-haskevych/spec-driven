import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { phaseEdges, phaseState } from "./factories";
import { boardInputs, NOW, specFixture, workspaceView } from "./board-factories";

const open = (id: string, needs: string[] = []) => phaseState({ id, name: `Phase ${id} title`, edges: phaseEdges({ declared: true, needs }) });
const done = (id: string) => phaseState({ id, name: `Phase ${id} title`, done: true, edges: phaseEdges({ declared: true }) });
const rows = (board: ReturnType<typeof buildBoard>) => board.lanes.ready.map((row) => [row.spec, row.phase, row.next, row.title]);

describe("ready row titles", () => {
  test("a phase row carries the phase's title; a stage row the spec's title, or its name", () => {
    const board = buildBoard(
      boardInputs([
        specFixture("alpha", { phases: [open("1")] }),
        specFixture("beta", { stage: "prep", title: "Beta Spec" }),
        specFixture("gamma", { stage: "create" }),
      ]),
      NOW,
    );
    expect(rows(board)).toEqual(
      expect.arrayContaining([
        ["alpha", "1", "execute", "Phase 1 title"],
        ["beta", undefined, "prep", "Beta Spec"],
        ["gamma", undefined, "create", "gamma"],
      ]),
    );
  });
});

describe("review row", () => {
  test("a spec with phases, no reviews/ and nothing ticked is one review row in place of its phases", () => {
    const alpha = specFixture("alpha", { title: "Alpha Spec", reviewed: false, phases: [open("1"), open("2", ["1"])] });
    const board = buildBoard(boardInputs([alpha]), NOW);
    expect(rows(board)).toEqual([["alpha", undefined, "review", "Alpha Spec"]]);
    expect(board.lanes.ready[0]?.target).toEqual({ newWorktree: "alpha" });
    expect(board.lanes.blocked).toEqual([]);
  });

  test("a reviewed spec, or one whose state doesn't say, keeps its phase rows", () => {
    for (const reviewed of [true, undefined]) {
      const board = buildBoard(boardInputs([specFixture("alpha", { reviewed, phases: [open("1")] })]), NOW);
      expect(rows(board)).toEqual([["alpha", "1", "execute", "Phase 1 title"]]);
    }
  });

  test("a ticked phase means work started: phase rows, no review", () => {
    const board = buildBoard(boardInputs([specFixture("alpha", { reviewed: false, phases: [done("1"), open("2", ["1"])] })]), NOW);
    expect(rows(board)).toEqual([["alpha", "2", "execute", "Phase 2 title"]]);
  });

  test("a phase ticked in a worktree, or a review committed only on a branch, keeps the phase rows", () => {
    const base = specFixture("alpha", { reviewed: false, phases: [open("1"), open("2")] });
    const ticked = workspaceView("/trees/alpha", [specFixture("alpha", { reviewed: false, phases: [done("1"), open("2")] })]);
    expect(rows(buildBoard(boardInputs([base], { workspaces: [ticked] }), NOW))).toEqual([["alpha", "2", "execute", "Phase 2 title"]]);

    const reviewedThere = workspaceView("/trees/alpha", [specFixture("alpha", { reviewed: true, phases: [open("1"), open("2")] })]);
    expect(rows(buildBoard(boardInputs([base], { workspaces: [reviewedThere] }), NOW)).map((row) => row[2])).toEqual(["execute", "execute"]);
  });

  test("a review row waits on the spec's own needs, like a stage row", () => {
    const alpha = specFixture("alpha", { phases: [open("1")] });
    const beta = specFixture("beta", { reviewed: false, phases: [open("1")], relations: [{ type: "needs", target: "alpha" }] });
    const board = buildBoard(boardInputs([alpha, beta]), NOW);
    expect(board.lanes.blocked).toEqual([{ spec: "beta", reasons: ["needs alpha"] }]);
  });

  test("a branch-only spec awaiting review is one review row in its worktree", () => {
    const tree = workspaceView("/trees/delta", [specFixture("delta", { reviewed: false, phases: [open("1")] })], { branch: "feat/delta", branchOnly: true });
    const board = buildBoard(boardInputs([], { workspaces: [tree] }), NOW);
    expect(board.lanes.ready.map((row) => [row.spec, row.next, row.target, row.onlyOn])).toEqual([["delta", "review", { workspace: "/trees/delta" }, "feat/delta"]]);
  });
});
