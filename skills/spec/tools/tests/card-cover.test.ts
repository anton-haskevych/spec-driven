import { describe, expect, test } from "bun:test";
import { coverLines, coverPlan, coverRefProblem, coveringCards } from "../cards/cover";
import { viewOf } from "./fake-record";
import { cardDoc, sourceDoc } from "./record-factories";

function node(phases: string[]) {
  return { phases: phases.map((id) => ({ id })) };
}

describe("coverRefProblem", () => {
  const nodes = new Map([["checkout", node(["1", "2", "2a", "3"])]]);
  test("a whole spec, one phase or a range resolves; anything else is named", () => {
    expect(["checkout", "checkout#2a", "checkout#1-2"].map((ref) => coverRefProblem(ref, nodes))).toEqual([undefined, undefined, undefined]);
    expect(coverRefProblem("billing", nodes)).toBe("no spec named billing");
    expect(coverRefProblem("checkout#9", nodes)).toBe("checkout has no phase 9 (phases: 1, 2, 2a, 3)");
  });
});

describe("coverPlan", () => {
  const view = viewOf({ "cards/0/c9.json": cardDoc({ id: "c9", coveredBy: ["checkout#1"] }) });
  const run = (intent: Parameters<typeof coverPlan>[0]) => {
    let line: string | undefined;
    return { result: coverPlan(intent, (seen) => (line = seen))(view), line };
  };

  test("adds refs to the card, and removes them", () => {
    expect(run({ id: "c9", add: ["checkout#2", "billing"], remove: [] })).toEqual({
      result: { message: "record: card cover c9", ops: [{ op: "update", path: "cards/0/c9.json", patch: { coveredBy: ["checkout#1", "checkout#2", "billing"] } }] },
      line: "card: c9 covered by checkout#1, checkout#2, billing",
    });
    expect(run({ id: "c9", add: [], remove: ["checkout#1"] }).line).toBe("card: c9 covered by nothing");
  });

  test("a ref already there changes nothing", () => {
    expect(run({ id: "c9", add: ["checkout#1"], remove: [] })).toEqual({ result: { unchanged: true }, line: "card: c9 covered by checkout#1" });
  });
});

describe("coveringCards", () => {
  test("an open card covering the spec or a phase of it, with its origin quote", () => {
    const view = viewOf({
      "cards/0/c9.json": cardDoc({ id: "c9", priority: "p0", coveredBy: ["checkout#1-2"] }),
      "sources/c9/a.json": sourceDoc({ card: "c9", person: "Chasity" }),
      "cards/0/c10.json": cardDoc({ id: "c10", title: "Faster pay", coveredBy: ["checkout"] }),
      "cards/0/c11.json": cardDoc({ id: "c11", status: "done", coveredBy: ["checkout"] }),
      "cards/0/c12.json": cardDoc({ id: "c12", coveredBy: ["checkouts"] }),
    });
    const rows = coveringCards(view, "checkout");
    expect(rows.map((row) => row.card.id)).toEqual(["c9", "c10"]);
    expect(coverLines(rows, "checkout")).toEqual([
      "Card c9 (p0 · asked) covers phases 1-2: Featured row keeps events visible",
      "  “I like having the Upcoming Events, now it doesn't show” — Chasity, imessage, 2026-11-11",
      "Card c10 (asked) covers the whole spec: Faster pay",
    ]);
  });
});
