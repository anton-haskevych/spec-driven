import { describe, expect, test } from "bun:test";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import { shipAloneMoves, specBranchProblems } from "../plan/docs/spec-branch-rules";
import type { SpecDoc } from "../plan/docs/spec-doc";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import { addEdit } from "../plan/ops/add";
import { planChangePlan } from "../plan/ops/change";
import { setEdit } from "../plan/ops/set";
import { viewOf } from "./fake-record";
import { phaseDoc, specDoc, task } from "./record-factories";

const SPEC = "checkout";
const MODE = { specBranch: { cutFrom: "c0ffee", shipAlone: ["D"] } };

const done = (id: string) => [task({ id: `${id}.1`, done: true })];

function phases(): PhaseDoc[] {
  return [
    phaseDoc({ id: "1", pr: "A" }),
    phaseDoc({ id: "2", pr: "B", needs: ["1"] }),
    phaseDoc({ id: "3", pr: "D" }),
  ];
}

const spec = (overrides: Partial<SpecDoc> = MODE, list = phases()) => specDoc({ name: SPEC, phases: list.map((phase) => phase.id), ...overrides });

describe("specBranchProblems", () => {
  test("outside spec-branch mode nothing is a problem", () => {
    const list = [...phases(), phaseDoc({ id: "4" })];
    expect(specBranchProblems(spec({}, list), list)).toEqual([]);
  });

  test("an open code phase without a group has no lane", () => {
    const list = [...phases(), phaseDoc({ id: "4" })];
    expect(specBranchProblems(spec(MODE, list), list)).toEqual([`phase 4 has no pr: group; spec-branch mode needs one (phase set ${SPEC} 4 --pr <g>)`]);
  });

  test("done phases and task phases need no group", () => {
    const list = [...phases(), phaseDoc({ id: "4", tasks: done("4") }), phaseDoc({ id: "5", code: false })];
    expect(specBranchProblems(spec(MODE, list), list)).toEqual([]);
  });

  test("a ship-alone group can't need an open phase of another group, by needs or needs-deployed", () => {
    const list = [phaseDoc({ id: "1", pr: "A" }), phaseDoc({ id: "2", pr: "A" }), phaseDoc({ id: "3", pr: "d", needs: ["1"], needsDeployed: ["2"] })];
    expect(specBranchProblems(spec(MODE, list), list)).toEqual([
      "ship-alone PR group d can't need phase 1 of PR group A: its code reaches main only with the final PR",
      "ship-alone PR group d can't need phase 2 of PR group A: its code reaches main only with the final PR",
    ]);
  });

  test("a ship-alone group may need its own phases and phases already done", () => {
    const list = [phaseDoc({ id: "1", pr: "A", tasks: done("1") }), phaseDoc({ id: "2", pr: "D" }), phaseDoc({ id: "3", pr: "D", needs: ["1", "2"] })];
    expect(specBranchProblems(spec(MODE, list), list)).toEqual([]);
  });
});

describe("shipAloneMoves", () => {
  test("a phase moving into or out of a ship-alone group is named", () => {
    const after = phases().map((phase) => (phase.id === "2" ? { ...phase, pr: "D" } : phase.id === "3" ? { ...phase, pr: "A" } : phase));
    expect(shipAloneMoves(spec(), phases(), after)).toEqual([
      `phase 2 can't move from PR group B to D: ship-alone groups are fixed while ${SPEC} is in spec-branch mode`,
      `phase 3 can't move from PR group D to A: ship-alone groups are fixed while ${SPEC} is in spec-branch mode`,
    ]);
  });

  test("moves between lanes, new phases and moves outside the mode pass", () => {
    const after = [...phases().map((phase) => (phase.id === "2" ? { ...phase, pr: "A" } : phase)), phaseDoc({ id: "4", pr: "D" })];
    expect(shipAloneMoves(spec(), phases(), after)).toEqual([]);
    expect(shipAloneMoves(spec({}), phases(), phases().map((phase) => ({ ...phase, pr: "D" })))).toEqual([]);
  });
});

describe("the phase writer in spec-branch mode", () => {
  const view = () => viewOf({ [specDocPath(SPEC)]: spec(), ...Object.fromEntries(phases().map((phase) => [phaseDocPath(SPEC, phase.id), phase])) });
  const refusal = (plan: ReturnType<typeof planChangePlan>) => {
    const result = plan(view());
    return "refused" in result ? result.refused : undefined;
  };

  test("refuses a new code phase without --pr", () => {
    expect(refusal(planChangePlan(SPEC, "add", addEdit({ spec: SPEC, title: "Late", edges: { needs: [] }, tasks: [] })))).toStartWith("phase 4 has no pr: group");
  });

  test("refuses clearing a phase's group", () => {
    expect(refusal(planChangePlan(SPEC, "set", setEdit({ spec: SPEC, phase: "2", fields: { pr: null } })))).toStartWith("phase 2 has no pr: group");
  });

  test("refuses moving a phase into a ship-alone group", () => {
    expect(refusal(planChangePlan(SPEC, "set", setEdit({ spec: SPEC, phase: "2", fields: { pr: "D" } })))).toContain("phase 2 can't move from PR group B to D");
  });

  test("still lets a lane regroup", () => {
    expect(refusal(planChangePlan(SPEC, "set", setEdit({ spec: SPEC, phase: "2", fields: { pr: "C" } })))).toBeUndefined();
  });
});
