import { describe, expect, test } from "bun:test";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import type { PrDoc } from "../plan/docs/pr-doc";
import type { SpecDoc } from "../plan/docs/spec-doc";
import { phaseDocPath, prDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { specBranchPlan } from "../plan/ops/spec-branch";
import { planWrites } from "../record/plan-writes";
import { viewOf } from "./fake-record";
import { phaseDoc, prDoc, specDoc } from "./record-factories";

const SPEC = "checkout";
const CUT = "c0ffee1234567890";

function view(options: { phases?: PhaseDoc[]; spec?: Partial<SpecDoc>; defaultDoc?: PrDoc } = {}) {
  const phases = options.phases ?? [phaseDoc({ id: "1", pr: "A" }), phaseDoc({ id: "2", pr: "D" })];
  return viewOf({
    [specDocPath(SPEC)]: specDoc({ name: SPEC, phases: phases.map((phase) => phase.id), ...options.spec }),
    ...Object.fromEntries(phases.map((phase) => [phaseDocPath(SPEC, phase.id), phase])),
    ...(options.defaultDoc ? { [prDocPath(SPEC, "default")]: options.defaultDoc } : {}),
  });
}

const plan = (shipAlone: string[] = ["D"]) => specBranchPlan({ spec: SPEC, cutFrom: CUT, shipAlone });

describe("specBranchPlan", () => {
  test("writes specBranch and group default's PR document together, and they validate", () => {
    const record = view();
    const result = plan()(record);
    expect(result).toEqual({
      ops: [
        { op: "update", path: specDocPath(SPEC), patch: { specBranch: { cutFrom: CUT, shipAlone: ["D"] } } },
        { op: "create", path: prDocPath(SPEC, "default"), doc: { group: "default", branch: "feat/checkout", state: "not-opened" } },
      ],
      message: "record: spec-branch checkout from c0ffee1",
    });
    expect("ops" in result && planWrites(record, result.ops, validateRecordDoc).kind).toBe("planned");
  });

  test("keeps an unnumbered default document instead of creating it again", () => {
    const result = plan()(view({ defaultDoc: prDoc({ group: "default", branch: "feat/checkout" }) }));
    expect("ops" in result && result.ops.map((op) => op.path)).toEqual([specDocPath(SPEC)]);
  });

  test("mode already on is a takeover: nothing written", () => {
    expect(plan(["A"])(view({ spec: { specBranch: { cutFrom: "old", shipAlone: ["D"] } } }))).toEqual({ unchanged: true });
  });

  test("a spec off the record is refused with the way on", () => {
    expect(specBranchPlan({ spec: "other", cutFrom: CUT, shipAlone: [] })(view())).toEqual({ refused: "other is not on the board; spec-branch mode needs the record (spec.ts join other)" });
  });

  test("refuses, at the tip, every start problem in one line", () => {
    const phases = [phaseDoc({ id: "1", pr: "A" }), phaseDoc({ id: "2" }), phaseDoc({ id: "3", pr: "D", needs: ["1"] })];
    const result = plan(["D", "Z"])(view({ phases, defaultDoc: prDoc({ group: "default", branch: "feat/checkout", state: "merged", number: 1201 }) }));
    expect(result).toEqual({
      refused: [
        "ship-alone Z is not a PR group of checkout",
        "phase 2 has no pr: group; spec-branch mode needs one (phase set checkout 2 --pr <g>)",
        "ship-alone PR group D can't need phase 1 of PR group A: its code reaches main only with the final PR",
        "checkout already shipped PR #1201 as one PR; put that work under its own group first",
      ].join("; "),
    });
  });
});
