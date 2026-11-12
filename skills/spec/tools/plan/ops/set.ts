import { withoutUndefined } from "../../core/read-fields";
import { describeFields, withFields as withPlanFields, type PhaseFields } from "../../phases/set";
import type { PhaseDoc } from "../docs/phase-doc";
import type { JoinedPlan } from "../state-source";
import { findPhaseDoc, type Edit, type PlanChange } from "./change";

export interface SetIntent {
  spec: string;
  phase: string;
  fields: PhaseFields;
}

export function setEdit(intent: SetIntent): (plan: JoinedPlan) => Edit<PlanChange> {
  return (plan) => {
    const phase = findPhaseDoc(plan, intent.phase);
    if (typeof phase === "string") return { refused: phase };
    const changed = withFields(phase, intent.fields);
    const said = describeFields(phase, withPlanFields(phase, intent.fields));
    if (said.length === 0) return { unchanged: `set: phase ${phase.id} already has those values` };
    return {
      phases: plan.phases.map((each) => (each.id === phase.id ? changed : each)),
      line: (version) => `set: phase ${phase.id} · ${said.join(" · ")} (plan v${version})`,
    };
  };
}

function withFields(phase: PhaseDoc, fields: PhaseFields): PhaseDoc {
  const { pr: _pr, gate: _gate, ...rest } = phase;
  const next = withPlanFields(phase, fields);
  return withoutUndefined({ ...rest, needs: next.needs, title: next.title, outcome: next.outcome, pr: next.pr, gate: next.gate });
}
