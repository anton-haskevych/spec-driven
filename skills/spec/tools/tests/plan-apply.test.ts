import { describe, expect, test } from "bun:test";
import { planApply } from "../plan/apply";

const AT = { joinedAt: "2026-11-12T10:00:00-08:00", joinedFrom: "c".repeat(40) };
const phase = (overrides: Record<string, unknown> = {}) => ({ id: "1", title: "Schema", outcome: "The schema exists.", file: "phases/phase-1-schema.md", needs: [], tasks: ["Write it", "Gate: design agreed with Anton"], ...overrides });

describe("planApply", () => {
  test("a draft becomes the spec and its phases, task ids <phase>.<n>, Gate: tasks marked", () => {
    const planned = planApply("alpha", { phases: [phase(), phase({ id: "2", title: "API", file: "phases/phase-2-api.md", needs: ["1"], pr: "A", tasks: ["Route"] })] }, AT);
    if ("problems" in planned) throw new Error(planned.problems.join("; "));
    expect(planned.spec).toEqual({ name: "alpha", planVersion: 1, phases: ["1", "2"], ...AT, layout: 2 });
    expect(planned.phases[0]?.tasks).toEqual([{ id: "1.1", text: "Write it", done: false }, { id: "1.2", text: "Gate: design agreed with Anton", done: false, gate: true }]);
    expect(planned.phases[1]).toMatchObject({ id: "2", needs: ["1"], pr: "A", code: true, tasks: [{ id: "2.1", text: "Route", done: false }] });
  });

  test("edges must be explicit, and refs and cycles must resolve", () => {
    const { needs: _, ...noNeeds } = phase();
    expect(planApply("alpha", { phases: [noNeeds] }, AT)).toEqual({ problems: ["phase 1: needs must be a list of strings, e.g. needs: [\"Vercel*\"]"] });
    const cycle = planApply("alpha", { phases: [phase({ needs: ["2"] }), phase({ id: "2", file: "phases/phase-2.md", needs: ["1", "9"] })] }, AT);
    expect(cycle).toEqual({ problems: ["phase 2 needs 9, which is not a phase of alpha", "needs cycle: 1 → 2 → 1"] });
  });

  test("a draft that isn't a list of phases, or repeats an id, is refused with what is wrong", () => {
    expect(planApply("alpha", { phases: [] }, AT)).toEqual({ problems: ["the draft has no phases"] });
    expect(planApply("alpha", [], AT)).toEqual({ problems: ["the draft must be an object with a phases list"] });
    expect(planApply("alpha", { phases: [phase(), phase()] }, AT)).toEqual({ problems: ["phase id 1 appears twice"] });
    expect(planApply("alpha", { phases: [phase({ tasks: ["ok", 3] })] }, AT)).toEqual({ problems: ["phase 1: tasks must be a list of task texts"] });
  });
});
