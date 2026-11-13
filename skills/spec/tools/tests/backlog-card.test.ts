import { describe, expect, test } from "bun:test";
import type { BacklogItem } from "../backlog/items";
import { backlogCardIntent, cardIdeas, importCardPlan, remainingFiles } from "../cards/backlog-card";
import type { RecordPlan } from "../record/write";
import { viewOf } from "./fake-record";
import { cardDoc, sourceDoc } from "./record-factories";

const AT = "2026-11-13T10:00:00-08:00";
const REF = "docs/specs/_backlog/organizer-accounts.md";
const ITEM: BacklogItem = {
  file: `/repo/${REF}`,
  slug: "organizer-accounts",
  title: "Organizer accounts for the directory",
  body: "Organizers log into our directory and manage their own listing.",
  tags: ["competitions"],
  priority: "p2",
  due: "2026-12-15",
  created: "2026-09-23T19:00:00-07:00",
};

function linesOf(plan: (see: (line: string) => void) => RecordPlan, view: ReturnType<typeof viewOf>) {
  let line: string | undefined;
  const result = plan((seen) => (line = seen))(view);
  return { result, line };
}

describe("backlogCardIntent", () => {
  test("an idea file becomes an idea card: its body is the quote, the file is where it was heard", () => {
    expect(backlogCardIntent(ITEM, REF, AT, ["my-spec"])).toEqual({
      title: ITEM.title,
      commitment: "idea",
      priority: "p2",
      due: "2026-12-15",
      tags: ["competitions"],
      coveredBy: ["my-spec"],
      at: AT,
      origin: { app: "backlog", occurredAt: "2026-09-23T19:00:00-07:00", quote: ITEM.body, ref: REF },
    });
  });

  test("an empty body quotes the title; no created date is now", () => {
    const intent = backlogCardIntent({ ...ITEM, body: "", created: undefined, priority: undefined, due: undefined }, REF, AT, []);
    expect(intent.origin).toEqual({ app: "backlog", occurredAt: AT, quote: ITEM.title, ref: REF });
    expect(intent).not.toHaveProperty("priority");
    expect(intent).not.toHaveProperty("coveredBy");
  });
});

describe("importCardPlan", () => {
  test("adds the card with its origin in one batch", () => {
    const { line, result } = linesOf((see) => importCardPlan(backlogCardIntent(ITEM, REF, AT, []), see), viewOf({ "cards/0/c4.json": cardDoc({ id: "c4" }) }));
    expect(line).toBe("card: c5 added (idea · p2 · tags: competitions)");
    expect(result).toMatchObject({ ops: [{ path: "cards/0/c5.json" }, { path: "sources/c5/a.json" }] });
  });

  test("a file another session already imported is refused with that card's id", () => {
    const view = viewOf({ "cards/0/c4.json": cardDoc({ id: "c4" }), "sources/c4/a.json": sourceDoc({ card: "c4", app: "backlog", ref: REF }) });
    expect(importCardPlan(backlogCardIntent(ITEM, REF, AT, []))(view)).toEqual({ refused: `${REF} is already card c4` });
  });
});

describe("the list's ideas", () => {
  test("open cards that cover nothing read as ideas; a covered, closed or dropped one doesn't", () => {
    const view = viewOf({
      "cards/0/c1.json": cardDoc({ id: "c1", title: "Loose", priority: "p1", tags: ["x"] }),
      "cards/0/c2.json": cardDoc({ id: "c2", coveredBy: ["some-spec"] }),
      "cards/0/c3.json": cardDoc({ id: "c3", status: "dropped", closed: { at: "2026-11-13", by: "Anton", why: "no" } }),
    });
    expect(cardIdeas(view)).toEqual([{ file: "", card: "c1", slug: "c1", title: "Loose", body: "", tags: ["x"], priority: "p1" }]);
  });

  test("a file some card came from is no longer listed", () => {
    const view = viewOf({ "cards/0/c4.json": cardDoc({ id: "c4" }), "sources/c4/a.json": sourceDoc({ card: "c4", app: "backlog", ref: REF }) });
    const other = { ...ITEM, slug: "other", file: "/repo/docs/specs/_backlog/other.md" };
    expect(remainingFiles([ITEM, other], view, "/repo").map((item) => item.slug)).toEqual(["other"]);
  });
});
