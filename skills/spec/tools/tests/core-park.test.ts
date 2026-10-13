import { describe, expect, test } from "bun:test";
import { openPark, parkEntries, parkOf, withAnswer, withPark } from "../core/park";

const PARKED = "- Parked 2026-10-13T10:00:00-07:00: Show parking notes at every studio? · recommend: no for now";
const NOTE = `# In-flight — phase 5a\n\n## Where things stand\n- half done\n\n## Needs you\n${PARKED}\n`;

describe("park entries", () => {
  test("reads a park entry with its question, recommendation and time", () => {
    expect(parkEntries(NOTE)).toEqual([
      { parkedAt: "2026-10-13T10:00:00-07:00", question: "Show parking notes at every studio?", recommend: "no for now" },
    ]);
    expect(openPark(NOTE)?.question).toBe("Show parking notes at every studio?");
  });

  test("ignores free-form Needs you lines and other sections", () => {
    expect(parkEntries("## Needs you\n- deploy needs Anton\n\n## Where\n- Parked 2026-10-13T10:00: not here\n")).toEqual([]);
  });

  test("an answered entry is not open", () => {
    const answered = withAnswer(NOTE, "no, later", "2026-10-13T11:00:00-07:00");
    expect(answered).toContain(`${PARKED}\n  - Answered 2026-10-13T11:00:00-07:00: no, later\n`);
    expect(openPark(answered ?? "")).toBeUndefined();
    expect(parkEntries(answered ?? "")[0]?.answer).toEqual({ at: "2026-10-13T11:00:00-07:00", text: "no, later" });
  });

  test("withAnswer has nothing to answer without an open entry", () => {
    expect(withAnswer("# note\n", "yes", "2026-10-13T11:00")).toBeUndefined();
  });

  test("withPark starts a note, or adds to the Needs you section and keeps the rest", () => {
    const entry = { question: "Which provider?", recommend: "Stripe", parkedAt: "2026-10-13T12:00:00-07:00" };
    expect(withPark(undefined, "3", entry)).toBe("# In-flight — phase 3\n\n## Needs you\n- Parked 2026-10-13T12:00:00-07:00: Which provider? · recommend: Stripe\n");
    const added = withPark(NOTE, "5a", { question: "And emails?", parkedAt: "2026-10-13T12:00:00-07:00" });
    expect(added).toBe(`# In-flight — phase 5a\n\n## Where things stand\n- half done\n\n## Needs you\n${PARKED}\n- Parked 2026-10-13T12:00:00-07:00: And emails?\n`);
  });

  test("parkOf reads only the phase's own in-flight file", () => {
    const notes = [{ file: "in-flight/phase-5a.md", text: NOTE }, { file: "in-flight/phase-6.md", text: NOTE }];
    expect(parkOf(notes, "5a")?.recommend).toBe("no for now");
    expect(parkOf(notes, "7")).toBeUndefined();
    expect(parkOf([{ file: "in-flight.md", text: NOTE }], "5a")).toBeUndefined();
  });
});
