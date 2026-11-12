import { familyOf, nextLetterIds } from "../../phases/ids";
import { phasePointer } from "../../phases/template";
import type { PhaseDoc, Task } from "../docs/phase-doc";
import { phaseDocDone, type JoinedPlan } from "../state-source";
import { findPhaseDoc, insertAfter, type Edit, type PlanChange } from "./change";
import { listIds } from "./id-list";

// `items[i]` are the open-task positions (1-based, as `#N` in tick) part i takes.
export interface SplitIntent {
  spec: string;
  id: string;
  titles: string[];
  items: number[][];
}

// The phase keeps its id; the parts get the next free letters and the tasks, ids and all.
export function splitEdit(intent: SplitIntent): (plan: JoinedPlan) => Edit<PlanChange> {
  return (plan) => {
    const phase = findPhaseDoc(plan, intent.id);
    if (typeof phase === "string") return { refused: phase };
    if (phaseDocDone(phase)) return { refused: `Phase ${phase.id} is done; add a phase after it with phase add --after ${phase.id}` };
    const ids = nextLetterIds(phase.id, plan.spec.phases, intent.titles.length);
    if (ids.length < intent.titles.length) return { refused: `Phase ${phase.id} has only ${ids.length} free letters left` };
    const taken = takeTasks(phase, intent.items);
    if (typeof taken === "string") return { refused: taken };
    const parts = intent.titles.map((title, index) => partOf(phase, ids[index] ?? "", title, taken[index] ?? []));
    const moved = new Set(taken.flat().map((task) => task.id));
    const kept = { ...phase, tasks: phase.tasks.filter((task) => !moved.has(task.id)) };
    const phases = insertAfter(
      plan.phases.map((each) => (each.id === phase.id ? kept : each)),
      familyOf(phase.id, plan.spec.phases),
      parts,
    );
    const added = parts.map((part) => `${part.id} added with ${listIds(part.tasks.map((task) => task.id))}`).join("; ");
    return { phases, line: (version) => `split: phase ${phase.id} keeps ${listIds(kept.tasks.map((task) => task.id))}; ${added} (plan v${version})` };
  };
}

function takeTasks(phase: PhaseDoc, items: readonly number[][]): Task[][] | string {
  const open = phase.tasks.filter((task) => !task.done);
  const missing = items.flat().find((position) => open[position - 1] === undefined);
  if (missing !== undefined) return `no open task #${missing} in phase ${phase.id}; open tasks: ${open.map((task, index) => `#${index + 1} ${task.id}`).join(", ") || "none"}`;
  return items.map((positions) => positions.flatMap((position) => open[position - 1] ?? []));
}

function partOf(phase: PhaseDoc, id: string, title: string, tasks: Task[]): PhaseDoc {
  const { needs, needsDeployed, sameFilesAs, pr, code } = phase;
  return { id, title, outcome: "", file: phasePointer(id, title), needs, ...(needsDeployed ? { needsDeployed } : {}), ...(sameFilesAs ? { sameFilesAs } : {}), ...(pr ? { pr } : {}), code, tasks };
}
