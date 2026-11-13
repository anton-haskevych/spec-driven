import { describe, expect, test } from "bun:test";
import { groupByTag } from "../cards/list";
import { cardRows } from "../cards/list";
import { setTagPlan, tagCardPlan } from "../cards/tags";
import type { RecordPlan } from "../record/write";
import type { RecordView } from "../record/view";
import { viewOf } from "./fake-record";
import { cardDoc, tagDoc } from "./record-factories";

function run(plan: (see: (line: string) => void) => RecordPlan, view: RecordView) {
  let line: string | undefined;
  const result = plan((seen) => (line = seen))(view);
  return { result, line };
}

const VIEW = viewOf({
  "cards/0/c1.json": cardDoc({ id: "c1", tags: ["Academy Ballroom"] }),
  "cards/0/c2.json": cardDoc({ id: "c2" }),
  "tags/schedule.json": tagDoc({ name: "Schedule", kind: "area" }),
});

describe("tagCardPlan", () => {
  test("a tag already on the board keeps its spelling; a new one is taken as given", () => {
    expect(run((see) => tagCardPlan({ id: "c2", add: ["academy ballroom", "SCHEDULE", "Pricing"], remove: [] }, see), VIEW)).toEqual({
      result: { message: "record: card tag c2", ops: [{ op: "update", path: "cards/0/c2.json", patch: { tags: ["Academy Ballroom", "Schedule", "Pricing"] } }] },
      line: "card: c2 tags Academy Ballroom, Schedule, Pricing",
    });
  });

  test("removes by any spelling; nothing to change says so", () => {
    expect(run((see) => tagCardPlan({ id: "c1", add: [], remove: ["academy ballroom"] }, see), VIEW).line).toBe("card: c1 tags none");
    expect(run((see) => tagCardPlan({ id: "c1", add: ["Academy Ballroom"], remove: [] }, see), VIEW)).toEqual({ result: { unchanged: true }, line: "card: c1 tags Academy Ballroom" });
  });
});

describe("setTagPlan", () => {
  test("creates a tag's details, then patches them; the name keeps the board's spelling", () => {
    expect(run((see) => setTagPlan({ name: "academy ballroom", fields: { kind: "customer", priority: "p0" } }, see), VIEW)).toEqual({
      result: { message: "record: tag academy-ballroom", ops: [{ op: "create", path: "tags/academy-ballroom.json", doc: { name: "Academy Ballroom", kind: "customer", priority: "p0" } }] },
      line: "tag: Academy Ballroom · customer · p0",
    });
    expect(run((see) => setTagPlan({ name: "schedule", fields: { priority: "p2", summary: "class times" }, ifVersion: "v1" }, see), VIEW)).toEqual({
      result: { message: "record: tag schedule", ops: [{ op: "update", path: "tags/schedule.json", patch: { priority: "p2", summary: "class times" }, ifVersion: "v1" }] },
      line: "tag: Schedule · area · p2 — class times",
    });
  });
});

describe("groupByTag", () => {
  test("tags by priority then name, a card under each of its tags, untagged last", () => {
    const view = viewOf({
      "cards/0/c1.json": cardDoc({ id: "c1", tags: ["Schedule", "Academy Ballroom"] }),
      "cards/0/c2.json": cardDoc({ id: "c2", tags: ["Pricing"] }),
      "cards/0/c3.json": cardDoc({ id: "c3" }),
      "tags/academy-ballroom.json": tagDoc({ name: "Academy Ballroom", kind: "customer", priority: "p0" }),
    });
    const groups = groupByTag(cardRows(view), view);
    expect(groups.map((group) => [group.heading, group.rows.map((row) => row.card.id)])).toEqual([
      ["Academy Ballroom · customer · p0", ["c1"]],
      ["Pricing", ["c2"]],
      ["Schedule", ["c1"]],
      ["No tag", ["c3"]],
    ]);
  });
});
