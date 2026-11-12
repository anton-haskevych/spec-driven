import type { RecordView } from "../record/view";
import { planShapeOf } from "./plan-diff";
import { noticePlanChange } from "./plan-version";
import type { PhaseDeps, PhaseOutcome } from "./phase-writer";
import { readLocalPlans } from "./read-plans";
import { recordWorld, type RecordWorld } from "./record-send";
import { readJoinedPlan, type JoinedPlan } from "./state-source";

// A write is diffed against the record its plan last ran on, before its own change: a session is never told
// about what it just did. A landed write then remembers the tip it made, which its push left in the
// tracking ref, so no second fetch.
export async function withPlanNotice(
  projectDir: string,
  spec: string,
  joined: JoinedPlan,
  deps: PhaseDeps,
  write: (world: RecordWorld) => PhaseOutcome | Promise<PhaseOutcome>,
): Promise<PhaseOutcome> {
  const { memory } = deps;
  if (!memory) return write(recordWorld(projectDir, deps));
  let tip: RecordView | undefined;
  const outcome = await write({ ...recordWorld(projectDir, deps), watch: (view) => (tip = view) });
  const before = (tip && readJoinedPlan(tip, spec)) ?? joined;
  const notice = noticePlanChange(memory, spec, planShapeOf(before));
  if (outcome.kind === "landed") {
    const after = readLocalPlans(projectDir, deps.runner, deps.now()).joined(spec);
    if (after) memory.show(spec, planShapeOf(after));
  }
  return notice ? { ...outcome, notice } : outcome;
}
