import { describe, expect, test } from "bun:test";
import { replaceTaskLines } from "../plan/deliverables";
import { ON_BOARD } from "../phases/template";

describe("replaceTaskLines", () => {
  const phase = (deliverables: string) => `# Phase 2\n\nGoal.\n\n## Deliverables\n\n${deliverables}\n\n## Notes\n\n- [ ] not a task here\n`;

  test("swaps the boxes of the Deliverables section for the given lines, prose and other sections kept", () => {
    expect(replaceTaskLines(phase("- [x] one — abc\n- [ ] two"), [ON_BOARD])).toBe(phase(ON_BOARD));
  });

  test("the on-board sentence is replaced too, so tidy and export undo each other", () => {
    const tidied = replaceTaskLines(phase("- [x] one\n- [ ] two"), [ON_BOARD]);
    expect(replaceTaskLines(tidied, ["- [x] one", "- [ ] two"])).toBe(phase("- [x] one\n- [ ] two"));
  });

  test("an indented line under a box goes with it; text between boxes stays", () => {
    expect(replaceTaskLines(phase("Intro.\n\n- [ ] one\n  more about one\n- [ ] two"), ["- [ ] new"])).toBe(phase("Intro.\n\n- [ ] new"));
  });

  test("a section with nothing to replace gets the lines after its heading", () => {
    expect(replaceTaskLines(phase("Nothing yet."), ["- [ ] new"])).toBe(phase("- [ ] new\n\nNothing yet."));
  });

  test("with no Deliverables section, boxes outside fences are replaced where the first one was", () => {
    const body = "# Phase 1\n\n- [ ] one\n- plain\n- [x] two\n\n```\n- [ ] fenced\n```\n";
    expect(replaceTaskLines(body, [ON_BOARD])).toBe(`# Phase 1\n\n${ON_BOARD}\n- plain\n\n\`\`\`\n- [ ] fenced\n\`\`\`\n`);
  });

  test("with no section and no boxes, a Deliverables section is added at the end", () => {
    expect(replaceTaskLines("# Phase 1\n\nGoal.\n", ["- [ ] new"])).toBe("# Phase 1\n\nGoal.\n\n## Deliverables\n\n- [ ] new\n");
  });
});
