import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { renderBoard } from "../board/render";
import { unopenedPrs } from "../board/record-rows";
import type { FlightRow } from "../board/model";
import { NOW, boardInputs, specFixture } from "./board-factories";
import { phaseState } from "./factories";

const row = (overrides: Partial<FlightRow>): FlightRow => ({ spec: "alpha", phase: "2", workspace: "", next: "built, PR not opened", ...overrides });

describe("unopenedPrs", () => {
  test("one row per PR group, naming its built phases", () => {
    const rows = [row({ phase: "2", prGroup: "A" }), row({ phase: "3", prGroup: "A" }), row({ phase: "4" }), row({ phase: "5", next: "executing" })];
    expect(unopenedPrs(rows)).toEqual([
      { kind: "open-pr", spec: "alpha", prGroup: "A", phases: ["2", "3"] },
      { kind: "open-pr", spec: "alpha", phases: ["4"] },
    ]);
  });
});

test("a built joined phase with no PR is in flight and under needs you", () => {
  const alpha = specFixture("alpha", { phases: [phaseState({ id: "2", done: true })] });
  const inputs = boardInputs([alpha], { joinedActivity: new Map([["alpha#2", { tickedIn: [], wipIn: [], built: { prGroup: "A", prNotOpened: true } }]]) });
  const board = buildBoard(inputs, NOW);
  expect(board.lanes.inFlight).toMatchObject([{ spec: "alpha", phase: "2", prGroup: "A", next: "built, PR not opened" }]);
  expect(board.lanes.needsYou).toContainEqual({ kind: "open-pr", spec: "alpha", prGroup: "A", phases: ["2"] });
  expect(renderBoard(board)).toContain("built, PR not opened → open it");
});
