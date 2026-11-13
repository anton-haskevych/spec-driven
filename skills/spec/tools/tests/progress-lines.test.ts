import { describe, expect, test } from "bun:test";
import { insertAfterPhases, tickPhaseLine, untickPhaseLine } from "../phases/progress-lines";

const progress = "## Phases\n\n- [ ] Phase 1 — A → `phases/a.md`\n- [ ] Phase 2 — B → `phases/b.md`\n\n## Notes\n";

describe("insertAfterPhases", () => {
  test("inserts after whichever named pointer comes last in the file", () => {
    expect(insertAfterPhases(progress, ["phases/b.md", "phases/a.md"], ["NEW"])).toBe(
      "## Phases\n\n- [ ] Phase 1 — A → `phases/a.md`\n- [ ] Phase 2 — B → `phases/b.md`\nNEW\n\n## Notes\n",
    );
  });

  test("with no located pointer, appends after the last non-blank line", () => {
    expect(insertAfterPhases("## Phases\n\n", [], ["NEW", "TWO"])).toBe("## Phases\nNEW\nTWO\n\n");
  });
});

describe("tickPhaseLine", () => {
  test("ticks only the line holding the pointer, and leaves text without it alone", () => {
    expect(tickPhaseLine(progress, "phases/b.md")).toContain("- [ ] Phase 1 — A → `phases/a.md`\n- [x] Phase 2 — B");
    expect(tickPhaseLine(progress, "phases/zzz.md")).toBe(progress);
  });
});

describe("untickPhaseLine", () => {
  test("reopens the phase line it points at, and only that one", () => {
    const ticked = tickPhaseLine(tickPhaseLine(progress, "phases/a.md"), "phases/b.md");
    expect(untickPhaseLine(ticked, "phases/b.md")).toBe(tickPhaseLine(progress, "phases/a.md"));
  });
});
