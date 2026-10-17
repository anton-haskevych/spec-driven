import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { renderBoard } from "../board/render";
import { phaseEdges, phaseState } from "./factories";
import { board, boardInputs, NOW, readyRow, specFixture, workspaceView } from "./board-factories";

const STALE = "phase 3 predates the ledger move";
const open = (id: string) => phaseState({ id, name: `Phase ${id} title`, edges: phaseEdges({ declared: true }) });
const done = (id: string) => phaseState({ id, name: `Phase ${id} title`, done: true, edges: phaseEdges({ declared: true }) });

describe("stale spec on the board", () => {
  test("its ready phases collapse into one review row carrying the stale text", () => {
    const alpha = specFixture("alpha", { title: "Alpha Spec", meta: { stale: STALE }, phases: [done("1"), open("2"), open("3")] });
    const built = buildBoard(boardInputs([alpha]), NOW);
    expect(built.lanes.ready.map((row) => [row.spec, row.phase, row.next, row.title, row.stale])).toEqual([["alpha", undefined, "review", "Alpha Spec", STALE]]);
    expect(built.lanes.blocked).toEqual([]);
  });

  test("a spec without stale: keeps its phase rows and carries no stale field", () => {
    const built = buildBoard(boardInputs([specFixture("alpha", { phases: [done("1"), open("2")] })]), NOW);
    expect(built.lanes.ready.map((row) => [row.phase, row.next, row.stale])).toEqual([["2", "execute", undefined]]);
  });

  test("a branch-only stale spec is one review row in its worktree", () => {
    const tree = workspaceView("/trees/delta", [specFixture("delta", { meta: { stale: STALE }, phases: [done("1"), open("2")] })], { branch: "feat/delta", branchOnly: true });
    const built = buildBoard(boardInputs([], { workspaces: [tree] }), NOW);
    expect(built.lanes.ready.map((row) => [row.spec, row.next, row.target, row.stale])).toEqual([["delta", "review", { workspace: "/trees/delta" }, STALE]]);
  });

  test("its FOCUS row carries the stale text and reads ready for review", () => {
    const alpha = specFixture("alpha", { meta: { stale: STALE, focus: "must" }, phases: [done("1"), open("2")] });
    const built = buildBoard(boardInputs([alpha]), NOW);
    expect(built.lanes.focus.map((row) => [row.spec, row.stale, row.now])).toEqual([["alpha", STALE, { kind: "ready", phases: [], step: "review" }]]);
    expect(renderBoard(built, { lane: "focus" })).toContain("alpha  1/2  ready: /spec review · ⚠ stale");
  });
});

describe("stale row rendering", () => {
  test("the ready row shows ⚠ and the stale text after the band", () => {
    const base = board();
    const row = readyRow({ phase: undefined, next: "review", stale: STALE, focusBand: "must", focus: 1 });
    const text = renderBoard(board({ lanes: { ...base.lanes, ready: [row] } }), { lane: "ready" });
    expect(text).toContain(`alpha  /spec review      must · ⚠ stale: ${STALE}`);
  });
});
