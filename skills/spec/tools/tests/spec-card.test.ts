import { describe, expect, test } from "bun:test";
import { cardSchedules, specCard, specCardSeed } from "../cards/spec-card";
import { viewOf } from "./fake-record";
import { cardDoc } from "./record-factories";

const AT = "2026-11-13T10:00:00-08:00";
const CLAUDE_MD = "---\ncreated: 2026-10-01T09:00:00-07:00\nstatus: active\npriority: p1\ndue: 2026-12-01\n---\n\n# Gift Cards Spec\n\nBody.\n";

describe("specCardSeed", () => {
  test("reads the title, priority, due date and created time from CLAUDE.md", () => {
    expect(specCardSeed(CLAUDE_MD, "gift-cards")).toEqual({ title: "Gift Cards Spec", priority: "p1", due: "2026-12-01", createdAt: "2026-10-01T09:00:00-07:00" });
  });

  test("a CLAUDE.md with no title or fields gives the spec's name", () => {
    expect(specCardSeed("", "gift-cards")).toEqual({ title: "gift-cards" });
  });
});

describe("specCard", () => {
  const seed = specCardSeed(CLAUDE_MD, "gift-cards");

  test("a spec no card covers gets one, with its priority and due date, in the same batch", () => {
    const made = specCard(viewOf({ "cards/0/c3.json": cardDoc({ id: "c3", coveredBy: ["other"] }) }), "gift-cards", seed, AT);
    expect(made?.id).toBe("c4");
    expect(made?.ops).toEqual([
      { op: "create", path: "cards/0/c4.json", doc: { id: "c4", title: "Gift Cards Spec", status: "open", commitment: "asked", priority: "p1", due: "2026-12-01", tags: [], coveredBy: ["gift-cards"], createdAt: AT } },
      { op: "create", path: "sources/c4/a.json", doc: { card: "c4", role: "origin", app: "spec", occurredAt: "2026-10-01T09:00:00-07:00", quote: "Gift Cards Spec", ref: "spec:gift-cards" } },
    ]);
  });

  test("a card covering the spec or one of its phases, open or done, means nothing is made; a dropped one doesn't count", () => {
    expect(specCard(viewOf({ "cards/0/c1.json": cardDoc({ id: "c1", coveredBy: ["gift-cards#2"] }) }), "gift-cards", seed, AT)).toBeUndefined();
    const done = cardDoc({ id: "c1", status: "done", coveredBy: ["gift-cards"], closed: { at: AT, by: "Anton", why: "shipped" } });
    expect(specCard(viewOf({ "cards/0/c1.json": done }), "gift-cards", seed, AT)).toBeUndefined();
    const dropped = cardDoc({ id: "c1", status: "dropped", coveredBy: ["gift-cards"], closed: { at: AT, by: "Anton", why: "dup" } });
    expect(specCard(viewOf({ "cards/0/c1.json": dropped }), "gift-cards", seed, AT)?.id).toBe("c2");
  });

  test("a seed the card rules refuse makes no card instead of refusing the batch", () => {
    expect(specCard(viewOf({}), "gift-cards", { title: "Call anna@example.com" }, AT)).toBeUndefined();
  });
});

describe("cardSchedules", () => {
  test("a spec's priority is its open covering cards' best, its due date their earliest", () => {
    const view = viewOf({
      "cards/0/c1.json": cardDoc({ id: "c1", priority: "p2", due: "2026-12-10", coveredBy: ["gift-cards"] }),
      "cards/0/c2.json": cardDoc({ id: "c2", priority: "p0", coveredBy: ["gift-cards#3", "other"] }),
      "cards/0/c3.json": cardDoc({ id: "c3", due: "2026-12-01", coveredBy: ["gift-cards"] }),
      "cards/0/c4.json": cardDoc({ id: "c4", priority: "p0", status: "done", coveredBy: ["quiet"], closed: { at: AT, by: "Anton", why: "shipped" } }),
    });
    const schedules = cardSchedules(view);
    expect(schedules.get("gift-cards")).toEqual({ priority: "p0", due: "2026-12-01" });
    expect(schedules.get("other")).toEqual({ priority: "p0" });
    expect(schedules.has("quiet")).toBe(false);
  });
});
