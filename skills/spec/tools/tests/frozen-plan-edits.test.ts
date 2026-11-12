import { describe, expect, test } from "bun:test";
import { changedPlanParts, joinedEditProblem } from "../hooks/frozen-plan-edits";

const phase = (frontmatter: string, boxes: string, prose = "Prose.") => `---\n${frontmatter}\n---\n# Phase 2\n\n${prose}\n\n## Deliverables\n\n${boxes}\n`;

describe("changedPlanParts", () => {
  const before = phase("needs: [1]\npr: B", "- [ ] model\n- [x] wire");

  test("prose and formatting edits change no plan part", () => {
    expect(changedPlanParts("phases/phase-2.md", before, phase("needs: [1]\npr: B", "- [ ] `model`\n- [x] wire", "New prose."))).toEqual([]);
  });

  test("a ticked, added or removed box changes the checkboxes", () => {
    expect(changedPlanParts("phases/phase-2.md", before, phase("needs: [1]\npr: B", "- [x] model\n- [x] wire"))).toEqual(["checkboxes"]);
    expect(changedPlanParts("phases/phase-2.md", before, phase("needs: [1]\npr: B", "- [ ] model\n- [x] wire\n- [ ] test"))).toEqual(["checkboxes"]);
  });

  test("needs, needs-deployed, same-files-as and pr are edges", () => {
    expect(changedPlanParts("phases/phase-2.md", before, phase("needs: [1, 3]\npr: B", "- [ ] model\n- [x] wire"))).toEqual(["edges"]);
    expect(changedPlanParts("phases/phase-2.md", before, phase("needs: [1]\npr: C", "- [x] model\n- [x] wire"))).toEqual(["checkboxes", "edges"]);
  });

  test("progress.md: a phase line ticked, added or marked deployed changes the phase list", () => {
    const list = "> On the board since 2026-11-11.\n\n- [ ] Phase 1 — One → `phases/phase-1.md`\n";
    expect(changedPlanParts("progress.md", list, list.replace("[ ]", "[x]"))).toEqual(["phase list"]);
    expect(changedPlanParts("progress.md", list, `${list}- [ ] Phase 2 — Two → \`phases/phase-2.md\`\n`)).toEqual(["phase list"]);
    expect(changedPlanParts("progress.md", list, list.replace("On the board", "On the live board"))).toEqual([]);
  });

  test("other spec files have no plan parts", () => {
    expect(changedPlanParts("design.md", "- [ ] a\n", "- [x] a\n")).toEqual([]);
  });
});

describe("joinedEditProblem", () => {
  test("names what changed and the command that will write it", () => {
    expect(joinedEditProblem("alpha", ["checkboxes", "edges"])).toBe(
      "alpha is on the board: its checkboxes and edges live in the record, so this edit changes nothing there. Undo it. Ticks go through `spec.ts phase tick <spec> <phase> <task-id>`; phase changes go through `phase add` / `split` / `move` / `set`.",
    );
  });
});
