import type { PhaseDoc, Task } from "../docs/phase-doc";
import type { JoinedPlan } from "../state-source";
import { findPhaseDoc, type Edit, type PlanChange } from "./change";
import { listIds } from "./id-list";
import { newTasks } from "./add";
import { findTask } from "./tick";

// `phase` is only where to look first: a task keeps its id when it moves.
export type TaskIntent = { spec: string; phase: string } & ({ action: "add"; texts: string[] } | { action: "edit"; task: string; text: string } | { action: "drop"; task: string });

export function taskEdit(intent: TaskIntent): (plan: JoinedPlan) => Edit<PlanChange> {
  return (plan) => {
    if (intent.action === "add") return added(plan, intent.phase, intent.texts);
    const found = findTask(plan, intent.phase, intent.task);
    if (!found) return { refused: `no task ${intent.task} in ${plan.spec.name}` };
    const { phase, task } = found;
    if (task.done) return { refused: `${task.id} is done; a done task stays as the record of the work` };
    if (intent.action === "edit" && task.text === intent.text) return { unchanged: `task: ${task.id} already reads "${task.text}"` };
    const tasks = intent.action === "edit" ? phase.tasks.map((each) => (each.id === task.id ? { ...each, text: intent.text } : each)) : phase.tasks.filter((each) => each.id !== task.id);
    const said = intent.action === "edit" ? `${task.id} reworded` : `dropped ${task.id}`;
    return { phases: withTasks(plan, phase, tasks), line: (version) => `task: phase ${phase.id} · ${said} (plan v${version})` };
  };
}

function added(plan: JoinedPlan, phaseId: string, texts: readonly string[]): Edit<PlanChange> {
  const phase = findPhaseDoc(plan, phaseId);
  if (typeof phase === "string") return { refused: phase };
  const fresh = newTasks(plan.phases, phase.id, texts);
  return {
    phases: withTasks(plan, phase, [...phase.tasks, ...fresh]),
    line: (version) => `task: phase ${phase.id} · added ${listIds(fresh.map((each) => each.id))} (plan v${version})`,
  };
}

function withTasks(plan: JoinedPlan, phase: PhaseDoc, tasks: Task[]): PhaseDoc[] {
  return plan.phases.map((each) => (each.id === phase.id ? { ...phase, tasks } : each));
}
