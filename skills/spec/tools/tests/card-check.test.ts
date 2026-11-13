import { describe, expect, test } from "bun:test";
import { cardProblems } from "../cards/check";
import { readCards, readSources } from "../cards/read";
import { cardIssues } from "../doctor/cards";
import { formatIssues } from "../doctor/issue";
import { viewOf } from "./fake-record";
import { cardDoc, sourceDoc } from "./record-factories";

describe("readCards and readSources", () => {
  test("cards come in number order across shards; a card's sources in letter order", () => {
    const view = viewOf({
      "cards/1/c120.json": cardDoc({ id: "c120" }),
      "cards/0/c9.json": cardDoc({ id: "c9" }),
      "cards/0/c10.json": { id: "c10" },
      "sources/c9/b.json": sourceDoc({ card: "c9", role: "mention" }),
      "sources/c9/a.json": sourceDoc({ card: "c9" }),
    });
    expect(readCards(view).map((card) => card.id)).toEqual(["c9", "c120"]);
    expect(readSources(view, "c9").map((source) => source.role)).toEqual(["origin", "mention"]);
    expect(readSources(view, "c120")).toEqual([]);
  });
});

describe("cardProblems", () => {
  test("a clean record has none", () => {
    expect(cardProblems(viewOf({ "cards/0/c9.json": cardDoc({ id: "c9" }), "sources/c9/a.json": sourceDoc({ card: "c9" }) }))).toEqual([]);
  });

  test("names unreadable documents, sources of missing cards and cards without exactly one origin", () => {
    const view = viewOf({
      "cards/0/c1.json": cardDoc({ id: "c1" }),
      "cards/0/c2.json": cardDoc({ id: "c2" }),
      "sources/c2/a.json": sourceDoc({ card: "c2" }),
      "sources/c2/b.json": sourceDoc({ card: "c2" }),
      "sources/c3/a.json": sourceDoc({ card: "c3" }),
      "tags/x.json": { name: "x", kind: "client" },
    });
    expect(cardProblems(view)).toEqual([
      { path: "cards/0/c1.json", problem: "has 0 origin sources, needs exactly 1" },
      { path: "cards/0/c2.json", problem: "has 2 origin sources, needs exactly 1" },
      { path: "sources/c3/a.json", problem: "card c3 does not exist" },
      { path: "tags/x.json", problem: 'kind must be customer, area or other, not "client"' },
    ]);
  });
});

describe("cardIssues", () => {
  test("the doctor names each problem by its place on the record; no record, no issues", () => {
    const view = viewOf({ "cards/0/c1.json": cardDoc({ id: "c1" }) });
    expect(formatIssues(cardIssues("/repo", view), "/repo")).toBe("error  refs/spec-board/record/cards/0/c1.json: has 0 origin sources, needs exactly 1");
    expect(cardIssues("/repo", undefined)).toEqual([]);
  });
});

describe("cover refs in the check", () => {
  test("an open card's cover that no longer resolves is named; a done card's is history", () => {
    const view = viewOf({
      "cards/0/c1.json": cardDoc({ id: "c1", coveredBy: ["checkout#2", "checkout#7"] }),
      "sources/c1/a.json": sourceDoc({ card: "c1" }),
      "cards/0/c2.json": cardDoc({ id: "c2", status: "done", closed: { at: "2026-11-13", by: "Anton", why: "shipped" }, coveredBy: ["gone"] }),
      "sources/c2/a.json": sourceDoc({ card: "c2" }),
    });
    const specs = new Map([["checkout", { phases: [{ id: "1" }, { id: "2" }] }]]);
    expect(cardProblems(view, specs)).toEqual([{ path: "cards/0/c1.json", problem: "covered by checkout#7: checkout has no phase 7 (phases: 1, 2)" }]);
  });
});
