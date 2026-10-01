import { describe, expect, test } from "bun:test";
import { insertAfterPhases } from "../phases/progress-insert";

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
