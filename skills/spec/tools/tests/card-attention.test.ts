import { describe, expect, test } from "bun:test";
import { cardAttention, type CoveredPhase } from "../cards/attention";
import { closeCardPlan } from "../cards/close";
import { viewOf } from "./fake-record";
import { cardDoc } from "./record-factories";

const CLOSED = { at: "2026-11-13", by: "Anton", why: "merged #1215; Chasity told" };
const PHASES: Record<string, CoveredPhase[]> = {
  checkout: [
    { id: "1", stage: "merged", finished: true },
    { id: "2", stage: "built", finished: false },
  ],
};
const phasesOf = (spec: string) => PHASES[spec];

describe("cardAttention", () => {
  test("an open card whose covering phases are all merged can close", () => {
    expect(cardAttention([cardDoc({ id: "c1", title: "A", coveredBy: ["checkout#1"] })], phasesOf)).toEqual([{ kind: "card-close", card: "c1", title: "A", covers: ["checkout#1"] }]);
  });

  test("a done card with an open covering phase is flagged; uncovered or still-open work says nothing", () => {
    const cards = [
      cardDoc({ id: "c2", title: "B", status: "done", closed: CLOSED, coveredBy: ["checkout#1-2"] }),
      cardDoc({ id: "c3", coveredBy: ["checkout#1-2"] }),
      cardDoc({ id: "c4" }),
      cardDoc({ id: "c5", coveredBy: ["elsewhere"] }),
    ];
    expect(cardAttention(cards, phasesOf)).toEqual([{ kind: "card-open", card: "c2", title: "B", open: ["checkout#2 is built"] }]);
  });

  test("a done card covering a whole spec isn't flagged; its phase-naming cover still is", () => {
    const whole = cardDoc({ id: "c30", status: "done", closed: CLOSED, coveredBy: ["checkout"] });
    const both = cardDoc({ id: "c31", title: "C", status: "done", closed: CLOSED, coveredBy: ["checkout", "checkout#2"] });
    expect(cardAttention([whole, both], phasesOf)).toEqual([{ kind: "card-open", card: "c31", title: "C", open: ["checkout#2 is built"] }]);
  });

  test("an open card covering a whole spec still proposes a close once every phase shipped", () => {
    const shipped = (spec: string) => (spec === "done-spec" ? [{ id: "1", stage: "merged", finished: true }] : undefined);
    expect(cardAttention([cardDoc({ id: "c5", title: "E", coveredBy: ["done-spec"] })], shipped)).toEqual([{ kind: "card-close", card: "c5", title: "E", covers: ["done-spec"] }]);
  });
});

describe("closeCardPlan", () => {
  const view = viewOf({ "cards/0/c9.json": cardDoc({ id: "c9" }) });
  const run = (intent: Parameters<typeof closeCardPlan>[0], on = view) => {
    let line: string | undefined;
    return { result: closeCardPlan(intent, (seen) => (line = seen))(on), line };
  };

  test("closes with its evidence; closing again changes nothing; a dropped card isn't closed", () => {
    expect(run({ id: "c9", status: "done", ...CLOSED })).toEqual({
      result: { message: "record: card close c9", ops: [{ op: "update", path: "cards/0/c9.json", patch: { status: "done", closed: CLOSED } }] },
      line: 'card: c9 done — "merged #1215; Chasity told"',
    });
    const done = viewOf({ "cards/0/c9.json": cardDoc({ id: "c9", status: "done", closed: CLOSED }) });
    expect(run({ id: "c9", status: "done", ...CLOSED }, done).line).toBe("card: c9 is already done");
    expect(run({ id: "c9", status: "dropped", ...CLOSED, why: "no longer wanted" }, done).result).toEqual({ refused: 'c9 was done 2026-11-13 by Anton: "merged #1215; Chasity told"' });
  });
});
