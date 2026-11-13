import { describe, expect, test } from "bun:test";
import { noteBody, noteFileText } from "../core/handoff-note";
import { withoutSection } from "../core/markdown-sections";

const NEEDS = "## Needs you\n- Parked T1: Ship today?\n  - Answered T2: yes\n";

describe("a hand-off note", () => {
  test("its body leaves out Needs you: questions live apart from the note", () => {
    expect(noteBody(`# In-flight — phase 7\n\nPick up from here: wire the crew.\n\n${NEEDS}`)).toBe("# In-flight — phase 7\n\nPick up from here: wire the crew.\n");
    expect(noteBody(NEEDS)).toBe("");
  });

  test("the file keeps the questions the previous file held, after the new note", () => {
    expect(noteFileText("# In-flight — phase 7\n\nnew\n", `# old\n\nold\n\n${NEEDS}`, "7")).toBe(`# In-flight — phase 7\n\nnew\n\n${NEEDS}`);
    expect(noteFileText("new\n\n## Needs you\n- Parked T9: stale?\n", undefined, "7")).toBe("new\n");
  });

  test("clearing keeps a file only for its questions", () => {
    expect(noteFileText(undefined, `# old\n\nold\n\n${NEEDS}`, "7")).toBe(`# In-flight — phase 7\n\n${NEEDS}`);
    expect(noteFileText(undefined, "# old\n\nold\n", "7")).toBeUndefined();
  });

  test("withoutSection removes one section and leaves the rest", () => {
    expect(withoutSection("# T\n\na\n\n## Needs you\n- x\n\n## Later\nb\n", "Needs you")).toBe("# T\n\na\n\n## Later\nb\n");
  });
});
