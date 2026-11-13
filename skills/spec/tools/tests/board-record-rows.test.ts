import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { renderBoard } from "../board/render";
import { unopenedPrs } from "../board/record-rows";
import type { FlightRow } from "../board/model";
import { NOW, boardInputs, specFixture } from "./board-factories";
import { phaseState } from "./factories";
import { viewOf } from "./fake-record";
import { cardDoc } from "./record-factories";
import { planSourceOf } from "../plan/read-plans";

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

test("cards on the record: one whose covering phase is done on main can close; a done card over an open phase is flagged", () => {
  const alpha = specFixture("alpha", { phases: [phaseState({ id: "1", done: true }), phaseState({ id: "2" })] });
  const closed = { at: "2026-11-13", by: "Anton", why: "shipped" };
  const view = viewOf({
    "cards/0/c1.json": cardDoc({ id: "c1", title: "Keep events visible", coveredBy: ["alpha#1"] }),
    "cards/0/c2.json": cardDoc({ id: "c2", title: "Filters say what they hide", status: "done", closed, coveredBy: ["alpha#2"] }),
  });
  const board = buildBoard(boardInputs([alpha], { plans: planSourceOf({ kind: "read", view, live: true }) }), NOW);
  expect(board.lanes.needsYou).toEqual(expect.arrayContaining([
    { kind: "card-close", card: "c1", title: "Keep events visible", covers: ["alpha#1"] },
    { kind: "card-open", card: "c2", title: "Filters say what they hide", open: ["alpha#2 is open"] },
  ]));
  const text = renderBoard(board);
  expect(text).toContain("Card c1 can close: alpha#1 merged");
  expect(text).toContain("Card c2 is done, but alpha#2 is open");
});
