import { describe, expect, test } from "bun:test";
import { readCardDoc } from "../cards/card-doc";
import { contactDetailsIn } from "../cards/contact";
import { cardDocPath, cardNumber, nextSourceLetter, sourceDocPath, tagDocPath, tagSlug } from "../cards/paths";
import { readSourceDoc } from "../cards/source-doc";
import { readTagDoc } from "../cards/tag-doc";
import { validateRecordDoc } from "../plan/kinds";
import { cardDoc, sourceDoc, tagDoc } from "./record-factories";

describe("paths", () => {
  test("cards shard by hundreds, sources nest under their card, tags by slug", () => {
    expect(cardDocPath("c7")).toBe("cards/0/c7.json");
    expect(cardDocPath("c1234")).toBe("cards/12/c1234.json");
    expect(cardNumber("c1234")).toBe(1234);
    expect(cardNumber("x9")).toBeUndefined();
    expect(sourceDocPath("c96", "b")).toBe("sources/c96/b.json");
    expect(tagSlug("Academy Ballroom")).toBe("academy-ballroom");
    expect(tagDocPath("Academy Ballroom")).toBe("tags/academy-ballroom.json");
  });

  test("source letters run a to z, then aa", () => {
    expect(nextSourceLetter([])).toBe("a");
    expect(nextSourceLetter(["a", "b"])).toBe("c");
    expect(nextSourceLetter(["z"])).toBe("aa");
    expect(nextSourceLetter(["aa", "c"])).toBe("ab");
  });
});

describe("contactDetailsIn", () => {
  test("finds emails and phone numbers", () => {
    expect(contactDetailsIn("write to anna@example.com please")).toEqual(["an email"]);
    expect(contactDetailsIn("call (480) 555-0142 or +1 480 555 0142")).toEqual(["a phone number"]);
  });

  test("dates, times, shas and PR numbers are not contact details", () => {
    expect(contactDetailsIn("on 2026-11-11 at 2026-11-11T19:42:13-08:00, #1215, 0651e4e, 10 to 20 students")).toEqual([]);
    expect(contactDetailsIn("from 2026-11-11 to 2026-11-12")).toEqual([]);
  });
});

describe("readCardDoc", () => {
  test("a card reads back as written", () => {
    const card = cardDoc({ priority: "p0", due: "2026-11-20", assignee: "Anton", tags: ["Academy Ballroom"], coveredBy: ["checkout#1-2"], note: "Spec: checkout" });
    expect(readCardDoc(JSON.parse(JSON.stringify(card)))).toEqual({ doc: card, problems: [] });
  });

  test("every bad field is named", () => {
    expect(readCardDoc({ id: "96", title: "", status: "todo", commitment: "maybe", priority: "urgent", due: "Friday", tags: "x", coveredBy: ["two words"], order: 3 }).problems).toEqual([
      'id must look like c<n>, not "96"',
      "title must be text",
      'status must be open, doing, done or dropped, not "todo"',
      'commitment must be promised, asked or idea, not "maybe"',
      'tags must be a list of strings, e.g. tags: ["Vercel*"]',
      'coveredBy: "two words" is not <spec> or <spec>#<phases>',
      "createdAt must be text",
      'priority "urgent" is not one of p0, p1, p2, p3',
      'due "Friday" is not a date; use YYYY-MM-DD',
      "unknown field: order",
    ]);
  });

  test("contact details are refused in the title and the note", () => {
    expect(readCardDoc(cardDoc({ note: "Anna: anna@example.com" })).problems).toEqual(["note holds an email; never put contact details on the board"]);
  });
});

describe("readSourceDoc", () => {
  test("a source reads back as written", () => {
    const source = sourceDoc({ person: "Chasity", refUrl: "https://example.com/m/1" });
    expect(readSourceDoc(JSON.parse(JSON.stringify(source)))).toEqual({ doc: source, problems: [] });
  });

  test("every bad field is named, and a quote with a phone number is refused", () => {
    expect(readSourceDoc({ card: "nine", role: "first", app: "", occurredAt: "yesterday", quote: "call me at 480-555-0142", ref: "" }).problems).toEqual([
      'card must look like c<n>, not "nine"',
      'role must be origin, mention or evidence, not "first"',
      "app must be text",
      'occurredAt "yesterday" is not a date or a time; use YYYY-MM-DD or ISO 8601 with an offset',
      "ref must be text",
      "quote holds a phone number; never put contact details on the board",
    ]);
  });
});

describe("readTagDoc", () => {
  test("a tag reads back, and a bad kind is named", () => {
    const tag = tagDoc({ priority: "p1", summary: "Academy Ballroom's studio" });
    expect(readTagDoc(tag)).toEqual({ doc: tag, problems: [] });
    expect(readTagDoc({ name: "x", kind: "client" }).problems).toEqual(['kind must be customer, area or other, not "client"']);
  });
});

describe("validateRecordDoc", () => {
  test("cards, sources and tags are stored at their own paths", () => {
    expect(validateRecordDoc("cards/0/c7.json", cardDoc({ id: "c7" }))).toEqual([]);
    expect(validateRecordDoc("cards/1/c7.json", cardDoc({ id: "c7" }))).toEqual(["cards/1/c7.json: id c7 does not match the path"]);
    expect(validateRecordDoc("sources/c7/a.json", sourceDoc({ card: "c7" }))).toEqual([]);
    expect(validateRecordDoc("sources/c8/a.json", sourceDoc({ card: "c7" }))).toEqual(["sources/c8/a.json: card c7 does not match the path"]);
    expect(validateRecordDoc("tags/academy-ballroom.json", tagDoc({ name: "Academy Ballroom" }))).toEqual([]);
    expect(validateRecordDoc("tags/ballroom.json", tagDoc({ name: "Academy Ballroom" }))).toEqual(["tags/ballroom.json: name Academy Ballroom does not match the path"]);
  });
});

describe("a closed card", () => {
  test("a done or dropped card says why; an open one has no closed", () => {
    const closed = { at: "2026-11-13T10:00:00-08:00", by: "Anton", why: "merged #1215; Chasity told on Nov 13" };
    expect(readCardDoc(cardDoc({ status: "done", closed })).problems).toEqual([]);
    expect(readCardDoc(cardDoc({ status: "dropped" })).problems).toEqual(["a dropped card says why in closed: { at, by, why }"]);
    expect(readCardDoc(cardDoc({ closed })).problems).toEqual(["an open card has no closed"]);
    expect(readCardDoc({ ...cardDoc({ status: "done" }), closed: { at: "x", by: "" } }).problems).toEqual(["closed: by must be text", "closed: why must be text", "a done card says why in closed: { at, by, why }"]);
  });
});
