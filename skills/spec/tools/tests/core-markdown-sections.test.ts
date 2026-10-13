import { describe, expect, test } from "bun:test";
import { childLines, sectionLines, withSection } from "../core/markdown-sections";

const NOTE = "# Note\n\n## Where things stand\n- one\n\n## Needs you\n- ask\n  - answer\n\n## Later\n- x\n";

describe("markdown sections", () => {
  test("reads a section's non-blank lines, and none for a missing one", () => {
    expect(sectionLines(NOTE, "Needs you")).toEqual(["- ask", "  - answer"]);
    expect(sectionLines(NOTE, "Ghost")).toEqual([]);
  });

  test("replaces one section and leaves the others byte-identical", () => {
    const next = withSection(NOTE, "Needs you", ["- other"]);
    expect(next).toBe("# Note\n\n## Where things stand\n- one\n\n## Needs you\n- other\n\n## Later\n- x\n");
  });

  test("appends a missing section at the end", () => {
    expect(withSection("# Note\n", "Needs you", ["- ask"])).toBe("# Note\n\n## Needs you\n- ask\n");
  });

  test("childLines are the indented lines under an item", () => {
    const lines = ["- ask", "  - answer", "- next"];
    expect(childLines(lines, 0)).toEqual(["  - answer"]);
    expect(childLines(lines, 2)).toEqual([]);
  });
});
