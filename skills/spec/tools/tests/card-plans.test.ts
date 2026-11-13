import { describe, expect, test } from "bun:test";
import { addCardPlan, cardSourcePlan, updateCardPlan, type AddCardIntent } from "../cards/plans";
import type { RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import { viewOf } from "./fake-record";
import { cardDoc, sourceDoc } from "./record-factories";

const AT = "2026-11-13T10:00:00-08:00";
const ADD: AddCardIntent = {
  title: "Featured row keeps events visible",
  commitment: "asked",
  priority: "p1",
  tags: ["Academy Ballroom", "Schedule"],
  at: AT,
  origin: { app: "imessage", person: "Chasity", occurredAt: "2026-11-11", quote: "now it doesn't show", ref: "msg 4821" },
};

function run(plan: (see: (line: string) => void) => RecordPlan, view: RecordView): { result: ReturnType<RecordPlan>; line?: string } {
  let line: string | undefined;
  const result = plan((seen) => (line = seen))(view);
  return line === undefined ? { result } : { result, line };
}

describe("addCardPlan", () => {
  test("takes the number after the highest at the tip and writes the origin in the same batch", () => {
    const view = viewOf({ "cards/0/c95.json": cardDoc({ id: "c95" }), "cards/0/c7.json": cardDoc({ id: "c7" }) });
    const { result, line } = run((see) => addCardPlan(ADD, see), view);
    expect(line).toBe("card: c96 added (asked · p1 · tags: Academy Ballroom, Schedule)");
    expect(result).toEqual({
      message: "record: card add c96",
      ops: [
        { op: "create", path: "cards/0/c96.json", doc: { id: "c96", title: ADD.title, status: "open", commitment: "asked", priority: "p1", tags: ["Academy Ballroom", "Schedule"], coveredBy: [], createdAt: AT } },
        { op: "create", path: "sources/c96/a.json", doc: { card: "c96", role: "origin", ...ADD.origin } },
      ],
    });
  });

  test("two adds against the same tip would collide; the second, planned on the first's result, gets the next number", () => {
    const first = viewOf({ "cards/0/c99.json": cardDoc({ id: "c99" }) });
    expect(run((see) => addCardPlan(ADD, see), first).line).toStartWith("card: c100 added");
    const second = viewOf({ "cards/0/c99.json": cardDoc({ id: "c99" }), "cards/1/c100.json": cardDoc({ id: "c100" }) });
    const planned = run((see) => addCardPlan(ADD, see), second);
    expect(planned.line).toStartWith("card: c101 added");
    expect(planned.result).toMatchObject({ ops: [{ path: "cards/1/c101.json" }, { path: "sources/c101/a.json" }] });
  });

  test("the first card is c1", () => {
    expect(run((see) => addCardPlan({ ...ADD, priority: undefined, tags: [] }, see), viewOf({})).line).toBe("card: c1 added (asked)");
  });
});

describe("updateCardPlan", () => {
  const view = viewOf({ "cards/0/c9.json": cardDoc({ id: "c9", priority: "p2", note: "old" }) });

  test("patches the named fields; none removes one", () => {
    const { result, line } = run((see) => updateCardPlan({ id: "c9", fields: { priority: "p0", due: "2026-11-20", note: null } }, see), view);
    expect(line).toBe("card: c9 updated (priority p0 · due 2026-11-20 · note removed)");
    expect(result).toEqual({ message: "record: card update c9", ops: [{ op: "update", path: "cards/0/c9.json", patch: { priority: "p0", due: "2026-11-20", note: null } }] });
  });

  test("carries the version the caller read", () => {
    expect(run((see) => updateCardPlan({ id: "c9", fields: { title: "New" }, ifVersion: "abc" }, see), view).result).toMatchObject({ ops: [{ ifVersion: "abc" }] });
  });

  test("the same values change nothing; a missing or closed card is refused", () => {
    expect(run((see) => updateCardPlan({ id: "c9", fields: { priority: "p2" } }, see), view)).toEqual({ result: { unchanged: true }, line: "card: c9 already has those values" });
    expect(run((see) => updateCardPlan({ id: "c8", fields: { priority: "p2" } }, see), view).result).toEqual({ refused: "no card c8 on the board" });
    const closed = viewOf({ "cards/0/c9.json": cardDoc({ id: "c9", status: "done", closed: { at: "2026-11-13", by: "Anton", why: "shipped" } }) });
    expect(run((see) => updateCardPlan({ id: "c9", fields: { title: "x" } }, see), closed).result).toEqual({ refused: "c9 is done; a closed card isn't edited" });
  });
});

describe("cardSourcePlan", () => {
  const view = viewOf({ "cards/0/c9.json": cardDoc({ id: "c9" }), "sources/c9/a.json": sourceDoc({ card: "c9" }) });
  const mention = { card: "c9", role: "mention" as const, app: "gmail", occurredAt: "2026-11-12", quote: "still missing", ref: "thread 7" };

  test("adds the next letter under the card", () => {
    const { result, line } = run((see) => cardSourcePlan(mention, see), view);
    expect(line).toBe("card: c9 · source b added (mention, gmail)");
    expect(result).toEqual({ message: "record: card source c9 b", ops: [{ op: "create", path: "sources/c9/b.json", doc: mention }] });
  });

  test("a second origin is refused; the same quote again changes nothing; a missing card is refused", () => {
    expect(run((see) => cardSourcePlan({ ...mention, role: "origin" }, see), view).result).toEqual({ refused: "c9 already has its origin (a); add this one as a mention" });
    const again = viewOf({ "cards/0/c9.json": cardDoc({ id: "c9" }), "sources/c9/a.json": sourceDoc({ card: "c9" }), "sources/c9/b.json": mention });
    expect(run((see) => cardSourcePlan(mention, see), again)).toEqual({ result: { unchanged: true }, line: "card: c9 already has that quote (b)" });
    expect(run((see) => cardSourcePlan({ ...mention, card: "c8" }, see), view).result).toEqual({ refused: "no card c8 on the board" });
  });
});
