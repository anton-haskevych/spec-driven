import { describe, expect, test } from "bun:test";
import { loadPlan, type LoadDocs } from "../cards/load";
import { readLoadFile } from "../cards/load-file";
import type { RecordView } from "../record/view";
import { viewOf } from "./fake-record";
import { cardDoc, sourceDoc, tagDoc } from "./record-factories";

const run = (docs: LoadDocs, view: RecordView, moveTaken = false) => {
  const lines: string[] = [];
  const result = loadPlan(docs, { moveTaken }, (line) => lines.push(line))(view);
  return { result, lines };
};

function docsOf(value: unknown): LoadDocs {
  const read = readLoadFile(value);
  if ("problems" in read) throw new Error(read.problems.join("; "));
  return read.docs;
}

const ACADEMY = {
  cards: { c01: cardDoc({ id: "c01", title: "Print button" }), c04: cardDoc({ id: "c04", title: "Featured row" }) },
  sources: {
    "c01/a": sourceDoc({ card: "c01" }),
    "c04/a": sourceDoc({ card: "c04" }),
    "c04/b": sourceDoc({ card: "c04", role: "mention", quote: "still missing" }),
  },
  tags: { "Academy Ballroom": tagDoc() },
};

describe("readLoadFile", () => {
  test("ids are compared by number and written in the record's form; a doc may leave its id to the key", () => {
    const docs = docsOf({ cards: { c01: { ...cardDoc(), id: undefined } }, sources: { "c001/a": { ...sourceDoc(), card: undefined } }, tags: { Schedule: { kind: "area" } } });
    expect(docs.cards).toEqual([{ id: "c1", doc: { ...cardDoc(), id: "c1" } }]);
    expect(docs.sources).toEqual([{ card: "c1", letter: "a", doc: { ...sourceDoc(), card: "c1" } }]);
    expect(docs.tags).toEqual([{ name: "Schedule", kind: "area" }]);
  });

  test("names every key it can't read", () => {
    const read = readLoadFile({ cards: { c5: cardDoc({ id: "c2" }), x7: {}, c1: cardDoc({ id: "c1" }), c01: cardDoc({ id: "c01" }) }, sources: { "c1/A": sourceDoc(), c1: sourceDoc(), "c3/a": sourceDoc({ card: "c4" }) }, extra: {} });
    expect(read).toEqual({
      problems: [
        "unknown key: extra (the file holds cards, sources and tags)",
        'cards: "c5" holds a card whose id is c2',
        'cards: "x7" is not a card id (c<n>)',
        'cards: "c1" and "c01" are the same card',
        'sources: "c1/A" is not <card>/<letter>',
        'sources: "c1" is not <card>/<letter>',
        'sources: "c3/a" holds a source of card c4',
      ],
    });
  });

  test("a file that isn't an object of objects", () => {
    expect(readLoadFile([])).toEqual({ problems: ["the file must be a JSON object of cards, sources and tags"] });
    expect(readLoadFile({ cards: [] })).toEqual({ problems: ["cards must be an object keyed by id"] });
  });
});

describe("loadPlan", () => {
  test("writes every card, source and tag under its own id in one batch", () => {
    const { result, lines } = run(docsOf(ACADEMY), viewOf({}));
    expect(lines).toEqual(["card load: 2 cards, 3 sources and 1 tag on the board"]);
    expect(result).toMatchObject({ message: "record: card load (2 cards)" });
    const ops = "ops" in result ? result.ops : [];
    expect(ops.map((op) => `${op.op} ${op.path}`)).toEqual([
      "create cards/0/c1.json",
      "create cards/0/c4.json",
      "create sources/c1/a.json",
      "create sources/c4/a.json",
      "create sources/c4/b.json",
      "create tags/academy-ballroom.json",
    ]);
  });

  test("a taken id refuses the whole load and names the ids", () => {
    const view = viewOf({ "cards/0/c1.json": cardDoc({ id: "c1" }), "cards/0/c4.json": cardDoc({ id: "c4" }), "cards/0/c2.json": cardDoc({ id: "c2" }) });
    expect(run(docsOf(ACADEMY), view).result).toEqual({ refused: "c1 and c4 are already on the board; --move-taken moves them up to free numbers" });
  });

  test("--move-taken moves each taken card and its sources above every number in the file and the record", () => {
    const view = viewOf({
      "cards/0/c1.json": cardDoc({ id: "c1", title: "Spec card", coveredBy: ["one-attendance-engine"] }),
      "sources/c1/a.json": sourceDoc({ card: "c1", quote: "spec words" }),
      "sources/c1/b.json": sourceDoc({ card: "c1", role: "mention", quote: "more" }),
      "cards/0/c2.json": cardDoc({ id: "c2" }),
      "sources/c2/a.json": sourceDoc({ card: "c2" }),
      "cards/0/c4.json": cardDoc({ id: "c4", title: "Nashville print" }),
      "sources/c4/a.json": sourceDoc({ card: "c4", quote: "print it" }),
    });
    const { result, lines } = run(docsOf(ACADEMY), view, true);
    expect(lines).toEqual(["card load: c1 → c5 (2 sources)", "card load: c4 → c6 (1 source)", "card load: 2 cards, 3 sources and 1 tag on the board"]);
    const ops = "ops" in result ? result.ops : [];
    expect(ops.map((op) => `${op.op} ${op.path}`).toSorted()).toEqual([
      "create cards/0/c5.json",
      "create cards/0/c6.json",
      "create sources/c5/a.json",
      "create sources/c5/b.json",
      "create sources/c6/a.json",
      "create tags/academy-ballroom.json",
      "replace cards/0/c1.json",
      "replace cards/0/c4.json",
      "replace sources/c1/a.json",
      "replace sources/c4/a.json",
      "delete sources/c1/b.json",
      "create sources/c4/b.json",
    ].toSorted());
    const doc = (path: string) => ops.find((op) => op.path === path && op.op !== "delete");
    expect(doc("cards/0/c5.json")).toMatchObject({ doc: { id: "c5", title: "Spec card", coveredBy: ["one-attendance-engine"] } });
    expect(doc("sources/c5/b.json")).toMatchObject({ doc: { card: "c5", quote: "more" } });
    expect(doc("cards/0/c1.json")).toMatchObject({ doc: { id: "c1", title: "Print button" } });
  });

  test("an existing tag takes the file's fields", () => {
    const view = viewOf({ "tags/academy-ballroom.json": tagDoc({ priority: "p2" }) });
    const ops = run(docsOf({ tags: { "Academy Ballroom": tagDoc({ priority: "p0" }) } }), view).result;
    expect(ops).toMatchObject({ ops: [{ op: "replace", path: "tags/academy-ballroom.json", doc: { priority: "p0" } }] });
  });

  test("checks the board as it will read: a source's card exists, one origin per card, each document reads", () => {
    const view = viewOf({ "cards/0/c9.json": cardDoc({ id: "c9" }), "sources/c9/a.json": sourceDoc({ card: "c9" }) });
    const file = {
      cards: { c1: cardDoc({ id: "c1", status: "sideways" as never }), c2: cardDoc({ id: "c2" }) },
      sources: { "c2/a": sourceDoc({ card: "c2" }), "c2/b": sourceDoc({ card: "c2" }), "c3/a": sourceDoc({ card: "c3" }), "c9/a": sourceDoc({ card: "c9", quote: "other words" }) },
    };
    expect(run(docsOf(file), view).result).toEqual({
      refused:
        'cards/0/c1.json: status must be open, doing, done or dropped, not "sideways"; cards/0/c2.json: has 2 origin sources, needs exactly 1; ' +
        "sources/c3/a.json: card c3 does not exist; sources/c9/a.json is already on the board (a quote is never replaced)",
    });
  });

  test("a long list of problems is cut after ten", () => {
    const cards = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`c${index + 1}`, cardDoc({ id: `c${index + 1}` })]));
    const refused = run(docsOf({ cards }), viewOf({})).result;
    expect("refused" in refused && refused.refused).toEndWith("… and 2 more");
  });
});
