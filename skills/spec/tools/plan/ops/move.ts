import type { PhaseDoc } from "../docs/phase-doc";
import type { JoinedPlan } from "../state-source";
import { findPhaseDoc, type Edit, type PlanChange } from "./change";
import { listIds } from "./id-list";
import { findTask } from "./tick";

// `from` is only where to look first: a task is found by its id wherever it is now.
export interface MoveIntent {
  spec: string;
  tasks: string[];
  to: string;
  from?: string;
}

export function moveEdit(intent: MoveIntent): (plan: JoinedPlan) => Edit<PlanChange> {
  return (plan) => {
    const target = findPhaseDoc(plan, intent.to);
    if (typeof target === "string") return { refused: target };
    const found = intent.tasks.map((id) => ({ id, at: findTask(plan, intent.from ?? target.id, id) }));
    const missing = found.filter((each) => !each.at).map((each) => each.id);
    if (missing.length > 0) return { refused: `no task ${listIds(missing)} in ${plan.spec.name}` };
    const moving = found.flatMap(({ at }) => (at && at.phase.id !== target.id ? [at.task] : []));
    if (moving.length === 0) return { unchanged: `move: ${listIds(intent.tasks)} ${intent.tasks.length === 1 ? "is" : "are"} already in phase ${target.id}` };
    const ids = new Set(moving.map((task) => task.id));
    const phases = plan.phases.map((phase): PhaseDoc => {
      const kept = phase.tasks.filter((task) => !ids.has(task.id));
      return phase.id === target.id ? { ...phase, tasks: [...kept, ...moving] } : kept.length === phase.tasks.length ? phase : { ...phase, tasks: kept };
    });
    return { phases, line: (version) => `move: ${listIds([...ids])} → phase ${target.id} (plan v${version})` };
  };
}
