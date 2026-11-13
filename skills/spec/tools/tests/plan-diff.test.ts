import { describe, expect, test } from "bun:test";
import { planChangedLine, planShapeOf, type PlanShape } from "../plan/plan-diff";
import { phaseDoc, specDoc, task } from "./record-factories";

function shape(version: number, phases: Parameters<typeof phaseDoc>[0][]): PlanShape {
  const docs = phases.map((overrides) => phaseDoc(overrides));
  return planShapeOf({ spec: specDoc({ planVersion: version, phases: docs.map((doc) => doc.id) }), phases: docs });
}

const tasks = (...ids: string[]) => ids.map((id) => task({ id, text: `task ${id}` }));

describe("planChangedLine", () => {
  const base = shape(7, [
    { id: "3", pr: "B", tasks: tasks("3.1", "3.2", "3.3", "3.4") },
    { id: "4", pr: "D", needs: ["3"], tasks: tasks("4.1") },
    { id: "5", pr: "D", needs: ["4"], tasks: tasks("5.1") },
  ]);

  test("the same version says nothing, whatever else differs", () => {
    expect(planChangedLine(base, { ...base, phases: [] })).toBeUndefined();
  });

  test("names phases added, a split, a phase moved to another PR and tasks moved, in one line", () => {
    const next = shape(9, [
      { id: "3", pr: "B", tasks: tasks("3.1", "3.2") },
      { id: "3a", pr: "B", needs: ["3"], tasks: tasks("3.3") },
      { id: "4", pr: "E", needs: ["3"], tasks: tasks("4.1") },
      { id: "5", pr: "D", needs: ["4"], tasks: tasks("5.1", "3.4") },
      { id: "6a", pr: "D", needs: ["5"], tasks: tasks("6a.1") },
    ]);
    expect(planChangedLine(base, next)).toBe(
      "Plan changed since this session loaded it (v7 → v9): phase 3 split into 3 and 3a · phase 6a added · phase 4 moved to PR E · 3.4 moved to phase 5",
    );
  });

  test("tasks added or removed, and edges changed, are named per phase", () => {
    const next = shape(8, [
      { id: "3", pr: "B", tasks: tasks("3.1", "3.2", "3.3", "3.4", "3.5", "3.6") },
      { id: "4", pr: "D", needs: ["3"], tasks: [] },
      { id: "5", pr: "D", needs: ["3", "4"], tasks: tasks("5.1") },
    ]);
    expect(planChangedLine(base, next)).toBe(
      "Plan changed since this session loaded it (v7 → v8): 3.5, 3.6 added to phase 3 · 4.1 removed · phase 5 now needs 3, 4",
    );
  });

  test("a version raised with nothing this summary reads (a title, an outcome) still says so", () => {
    expect(planChangedLine(base, { ...base, version: 8 })).toBe("Plan changed since this session loaded it (v7 → v8): plan edited");
  });

  test("more than five changes keep to one line", () => {
    const many = shape(12, [
      { id: "3", pr: "B", tasks: tasks("3.1", "3.2", "3.3", "3.4") },
      { id: "4", pr: "D", needs: ["3"], tasks: tasks("4.1") },
      { id: "5", pr: "D", needs: ["4"], tasks: tasks("5.1") },
      ...["6", "7", "8", "9", "10", "11"].map((id) => ({ id, tasks: tasks(`${id}.1`) })),
    ]);
    expect(planChangedLine(base, many)).toBe(
      "Plan changed since this session loaded it (v7 → v12): phase 6 added · phase 7 added · phase 8 added · phase 9 added · phase 10 added · +1 more",
    );
  });
});
