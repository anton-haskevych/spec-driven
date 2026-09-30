import { describe, expect, test } from "bun:test";
import { formatTickedItem, hasEvidence, isOpenItem, isTopLevelItem, tickedItemText } from "../core/checkbox";

describe("checkbox lines", () => {
  test("isOpenItem accepts any bullet and indentation, not ticked items", () => {
    expect(isOpenItem("- [ ] build")).toBe(true);
    expect(isOpenItem("   * [ ] nested")).toBe(true);
    expect(isOpenItem("- [x] done")).toBe(false);
    expect(isOpenItem("plain text")).toBe(false);
  });

  test("isTopLevelItem accepts open or ticked items with no indentation", () => {
    expect(isTopLevelItem("- [ ] Phase 1")).toBe(true);
    expect(isTopLevelItem("* [x] Phase 2")).toBe(true);
    expect(isTopLevelItem("  - [ ] nested")).toBe(false);
    expect(isTopLevelItem("- plain")).toBe(false);
  });

  test("tickedItemText returns the text of a ticked item only", () => {
    expect(tickedItemText("  + [X] shipped it ")).toBe("shipped it");
    expect(tickedItemText("- [ ] open")).toBeUndefined();
  });

  test("formatTickedItem keeps bullet and indentation, appending evidence after a dash", () => {
    expect(formatTickedItem("  * [ ] build it")).toBe("  * [x] build it");
    expect(formatTickedItem("- [ ] record video", "https://youtu.be/x")).toBe("- [x] record video — https://youtu.be/x");
  });

  test("formatTickedItem refuses a line that is not an open item", () => {
    expect(() => formatTickedItem("- [x] done")).toThrow();
  });

  test("hasEvidence accepts a date, a link, a code span or a path", () => {
    for (const text of ["sent 2026-09-30", "https://x.dev", "see `notes.md`", "docs/brief.md"]) {
      expect(hasEvidence(text)).toBe(true);
    }
    expect(hasEvidence("done")).toBe(false);
  });
});
