import { withoutUndefined } from "../../core/read-fields";
import { describeFields, withFields as withPlanFields, type PhaseFields, type PlanFields } from "../../phases/set";
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
    const said = describeFields(planFieldsOf(phase), withPlanFields(planFieldsOf(phase), intent.fields));
    if (said.length === 0) return { unchanged: `set: phase ${phase.id} already has those values` };
    return {
      phases: plan.phases.map((each) => (each.id === phase.id ? changed : each)),
      line: (version) => `set: phase ${phase.id} · ${said.join(" · ")} (plan v${version})`,
    };
  };
}

function withFields(phase: PhaseDoc, fields: PhaseFields): PhaseDoc {
  const { pr: _pr, gate: _gate, needsDeployed: _deployed, sameFilesAs: _same, ...rest } = phase;
  const next = withPlanFields(planFieldsOf(phase), fields);
  const list = (ids: string[]) => (ids.length === 0 ? undefined : ids);
  return withoutUndefined({ ...rest, needs: next.needs, needsDeployed: list(next.needsDeployed), sameFilesAs: list(next.sameFilesAs), title: next.title, outcome: next.outcome, pr: next.pr, gate: next.gate });
}

// A record phase leaves an empty edge list out; the planner compares lists.
function planFieldsOf(phase: PhaseDoc): PlanFields {
  return { ...phase, needsDeployed: phase.needsDeployed ?? [], sameFilesAs: phase.sameFilesAs ?? [] };
}
