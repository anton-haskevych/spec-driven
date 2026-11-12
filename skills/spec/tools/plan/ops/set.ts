import type { GateKind } from "../../core/gate";
import { withoutUndefined } from "../../core/read-fields";
import type { PhaseDoc } from "../docs/phase-doc";
import type { JoinedPlan } from "../state-source";
import { findPhaseDoc, type Edit, type PlanChange } from "./change";

// A field left out is kept; `null` clears `pr` or `gate`, and `needs: []` clears the needs.
export interface PhaseFields {
  needs?: string[];
  pr?: string | null;
  gate?: GateKind | null;
  title?: string;
  outcome?: string;
}

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
    const said = describeFields(phase, changed);
    if (said.length === 0) return { unchanged: `set: phase ${phase.id} already has those values` };
    return {
      phases: plan.phases.map((each) => (each.id === phase.id ? changed : each)),
      line: (version) => `set: phase ${phase.id} · ${said.join(" · ")} (plan v${version})`,
    };
  };
}

function withFields(phase: PhaseDoc, fields: PhaseFields): PhaseDoc {
  const { pr, gate, ...rest } = phase;
  return withoutUndefined({
    ...rest,
    ...(fields.needs ? { needs: fields.needs } : {}),
    ...(fields.title ? { title: fields.title } : {}),
    ...(fields.outcome !== undefined ? { outcome: fields.outcome } : {}),
    pr: fields.pr === undefined ? pr : (fields.pr ?? undefined),
    gate: fields.gate === undefined ? gate : (fields.gate ?? undefined),
  });
}

export function describeFields(before: Pick<PhaseDoc, "needs" | "pr" | "gate" | "title" | "outcome">, after: typeof before): string[] {
  const same = (key: keyof typeof before) => JSON.stringify(before[key]) === JSON.stringify(after[key]);
  return [
    same("needs") ? undefined : after.needs.length === 0 ? "needs nothing" : `needs ${after.needs.join(", ")}`,
    same("pr") ? undefined : after.pr ? `PR ${after.pr}` : "no PR group",
    same("gate") ? undefined : after.gate ? `gate ${after.gate}` : "no gate",
    same("title") ? undefined : `title "${after.title}"`,
    same("outcome") ? undefined : "outcome reworded",
  ].filter((part): part is string => part !== undefined);
}
