import { describe, expect, test } from "bun:test";
import { allTasksDone, countTasks, entryTaskCount } from "../core/phase-entry";

const DELIVERABLES_AND_VERIFICATION = [
  "---",
  "needs: [1]",
  "---",
  "## Deliverables",
  "- [x] one",
  "- [x] two",
  "",
  "## Verification",
  "- [ ] smoke test",
  "",
].join("\n");

describe("the one task-count rule", () => {
  test("counts done and open tasks", () => {
    expect(countTasks([{ done: true }, { done: false }, { done: true }])).toEqual({ checked: 2, unchecked: 1 });
  });

  test("a phase is complete only with at least one task and every task done", () => {
    expect(allTasksDone(countTasks([{ done: true }, { done: true }]))).toBe(true);
    expect(allTasksDone(countTasks([{ done: true }, { done: false }]))).toBe(false);
    expect(allTasksDone(countTasks([]))).toBe(false);
  });

  test("an entry's tasks are its Deliverables section when it has one, frontmatter ignored", () => {
    expect(entryTaskCount(DELIVERABLES_AND_VERIFICATION)).toEqual({ checked: 2, unchecked: 0 });
  });

  test("an entry with no Deliverables section counts every box", () => {
    expect(entryTaskCount("- [x] one\n  - [ ] nested\n- [ ] two\n")).toEqual({ checked: 1, unchecked: 2 });
  });
});
