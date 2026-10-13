import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { renderBoard } from "../board/render";
import type { InFlightNote } from "../core/in-flight";
import { phaseEdges, phaseState } from "./factories";
import { boardInputs, NOW, specFixture, workspaceView, type SpecFixture } from "./board-factories";

const open = (id: string) => phaseState({ id, name: `P${id}`, edges: phaseEdges({ declared: true, needs: [] }) });
const PARKED = "## Needs you\n- Parked 2026-10-01T12:00:00-07:00: Grid or list? · recommend: grid\n";
const ANSWERED = `${PARKED}  - Answered 2026-10-01T13:00:00-07:00: grid\n`;

function studio(notes: InFlightNote[]): SpecFixture {
  const fixture = specFixture("studio", { phases: [open("1"), open("2")] });
  return { ...fixture, state: { ...fixture.state, inFlight: notes } };
}

describe("parked phases on the board", () => {
  test("leave the ready lane and ask their question under needs you", () => {
    const board = buildBoard(boardInputs([studio([{ file: "in-flight/phase-1.md", text: PARKED }])]), NOW);
    expect(board.lanes.ready.map((row) => row.phase)).toEqual(["2"]);
    expect(board.lanes.needsYou).toEqual([
      { kind: "question", spec: "studio", phase: "1", question: "Grid or list?", recommend: "grid", since: "2026-10-01T12:00:00-07:00" },
    ]);
    expect(renderBoard(board, { lane: "you" })).toContain("studio · 1 asks: Grid or list?  I'd say grid");
  });

  test("an answered question is ready again", () => {
    const board = buildBoard(boardInputs([studio([{ file: "in-flight/phase-1.md", text: ANSWERED }])]), NOW);
    expect(board.lanes.ready.map((row) => row.phase)).toEqual(["1", "2"]);
    expect(board.lanes.needsYou).toEqual([]);
  });

  test("a worktree's copy of the note wins over base", () => {
    const base = studio([{ file: "in-flight/phase-1.md", text: PARKED }]);
    const answeredInTree = studio([{ file: "in-flight/phase-1.md", text: ANSWERED }]);
    const parkedInTree = studio([{ file: "in-flight/phase-2.md", text: PARKED }]);
    const board = buildBoard(boardInputs([base], { workspaces: [workspaceView("/trees/studio", [answeredInTree]), workspaceView("/trees/other", [parkedInTree])] }), NOW);
    expect(board.lanes.needsYou.map((row) => ("phase" in row ? row.phase : undefined))).toEqual(["2"]);
  });

  test("a question without a recommendation asks for an answer", () => {
    const text = "## Needs you\n- Parked 2026-10-01T12:00:00-07:00: Which provider?\n";
    const board = buildBoard(boardInputs([studio([{ file: "in-flight/phase-2.md", text }])]), NOW);
    expect(renderBoard(board, { lane: "you" })).toContain("studio · 2 asks: Which provider?  answer it");
  });
});
