import { withoutUndefined } from "../../core/read-fields";
import { familyOf, nextIntegerId, nextLetterIds } from "../../phases/ids";
import { phasePointer, type PhaseFileEdges } from "../../phases/template";
import type { PhaseDoc, Task } from "../docs/phase-doc";
import type { JoinedPlan } from "../state-source";
import { findPhaseDoc, insertAfter, type Edit, type PlanChange } from "./change";

export interface AddIntent {
  spec: string;
  title: string;
  after?: string;
  edges: PhaseFileEdges;
  tasks: string[];
}

export function addEdit(intent: AddIntent): (plan: JoinedPlan) => Edit<PlanChange> {
  return (plan) => {
    const placed = placement(plan, intent.after);
    if (typeof placed === "string") return { refused: placed };
    const file = phasePointer(placed.id, intent.title);
    const owner = plan.phases.find((phase) => phase.file === file);
    if (owner) return { refused: `${file} already belongs to phase ${owner.id}` };
    const phase = newPhase(placed.id, intent.title, file, intent.edges, newTasks(plan.phases, placed.id, intent.tasks));
    return {
      phases: insertAfter(plan.phases, placed.family, [phase]),
      line: (version) => `add: phase ${phase.id} — ${phase.title} → ${file}${taskCount(phase.tasks)} (plan v${version})`,
    };
  };
}

// Edges and code copied from a phase file's frontmatter shape; `needs` is always written out.
export function newPhase(id: string, title: string, file: string, edges: PhaseFileEdges, tasks: Task[]): PhaseDoc {
  return withoutUndefined({
    id,
    title,
    outcome: "",
    file,
    needs: [...(edges.needs ?? [])],
    needsDeployed: edges.needsDeployed?.length ? [...edges.needsDeployed] : undefined,
    sameFilesAs: edges.sameFilesAs?.length ? [...edges.sameFilesAs] : undefined,
    pr: edges.pr,
    code: edges.code ?? true,
    tasks,
  });
}

// `<phase>.<n>`, n past every id with that prefix anywhere in the spec: a task moved out keeps its id.
export function newTasks(phases: readonly PhaseDoc[], phaseId: string, texts: readonly string[]): Task[] {
  const prefix = `${phaseId}.`;
  const used = phases.flatMap((phase) => phase.tasks.map((task) => task.id)).filter((id) => id.startsWith(prefix));
  const last = Math.max(0, ...used.map((id) => Number(id.slice(prefix.length))).filter(Number.isInteger));
  return texts.map((text, index) => ({ id: `${prefix}${last + index + 1}`, text, done: false }));
}

function placement(plan: JoinedPlan, after: string | undefined): { id: string; family: string[] } | string {
  const ids = plan.spec.phases;
  if (after === undefined) return { id: nextIntegerId(ids), family: [] };
  const base = findPhaseDoc(plan, after);
  if (typeof base === "string") return base;
  const [id] = nextLetterIds(base.id, ids, 1);
  return id ? { id, family: familyOf(base.id, ids) } : `Phase ${base.id} has no free letter left`;
}

function taskCount(tasks: readonly Task[]): string {
  return tasks.length === 0 ? "" : ` · ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
}
