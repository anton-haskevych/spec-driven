import { ago } from "../../board/cells";
import { allTasksDone, countTasks } from "../../core/phase-entry";
import { isPlainObject } from "../../record/document";
import type { RecordPlan } from "../../record/write";
import type { PhaseDoc, Task } from "../docs/phase-doc";
import { phaseDocPath } from "../kinds";
import { readJoinedPlan, type JoinedPlan } from "../state-source";
import { approvalOps } from "../../questions/gate";
import type { QuestionAnswer } from "../../questions/question-doc";

// What a tick asks for, as it is queued: `at` is the tick's time, so a refusal's "4m ago" never depends on
// when the plan ran.
export interface TickIntent {
  spec: string;
  phase: string;
  task: string;
  evidence: string;
  at: string;
  session?: string;
  tree: string;
  unpushed?: boolean;
  // A Gate: task approved at the tick: recorded as its answered gate question in the same write.
  approval?: QuestionAnswer;
}

export type TickSeen = { kind: "ticked"; phase: string; task: string; phaseComplete: boolean } | { kind: "already"; phase: string; task: Task };

const FULL_SHA = /^[0-9a-f]{40}\b/;

// Planned against each fresh tip: a task closed meanwhile by someone else refuses, one this session closed is
// unchanged. Ids stay with a task that moved, so the named phase is only where to look first.
export function tickPlan(intent: TickIntent, see: (seen: TickSeen) => void = () => {}): RecordPlan {
  return (view) => {
    const plan = readJoinedPlan(view, intent.spec);
    if (!plan) return { refused: `${intent.spec} is not on the board` };
    const found = findTask(plan, intent.phase, intent.task);
    if (!found) return { refused: `no task ${intent.task} in ${intent.spec}` };
    const { phase, task } = found;
    if (task.done && closedBySameSession(task, intent)) {
      see({ kind: "already", phase: phase.id, task });
      return { unchanged: true };
    }
    if (task.done) return { refused: closedLine(task, intent.at) };
    const tasks = phase.tasks.map((each) => (each.id === task.id ? closed(each, intent) : each));
    see({ kind: "ticked", phase: phase.id, task: task.id, phaseComplete: allTasksDone(countTasks(tasks)) });
    const approval = intent.approval ? approvalOps(plan, phase.id, task, intent.approval) : [];
    return { ops: [{ op: "update", path: phaseDocPath(intent.spec, phase.id), patch: { tasks } }, ...approval], message: `record: tick ${intent.spec} ${task.id}` };
  };
}

export function findTask(plan: JoinedPlan, phaseId: string, taskId: string): { phase: PhaseDoc; task: Task } | undefined {
  const named = plan.phases.filter((phase) => phase.id === phaseId);
  for (const phase of [...named, ...plan.phases.filter((phase) => phase.id !== phaseId)]) {
    const task = phase.tasks.find((each) => each.id === taskId);
    if (task) return { phase, task };
  }
  return undefined;
}

export function closedLine(task: Task, at: string): string {
  const commit = shortEvidence(task.evidence);
  if (!task.doneAt || !task.doneIn) return `${task.id} was already closed${commit ? ` (${commit})` : ""}`;
  return `${task.id} was closed ${ago(new Date(task.doneAt), new Date(at))} ago by the session in tree ${task.doneIn}${commit ? ` (${commit})` : ""}`;
}

export function shortEvidence(evidence: string | undefined): string | undefined {
  return evidence && FULL_SHA.test(evidence) ? evidence.slice(0, 7) : evidence;
}

// Without a session id, the same tree and the same commit stand in for "this session".
export function closedBySameSession(task: Task, by: { session?: string; tree: string; evidence?: string }): boolean {
  if (by.session !== undefined) return task.doneBy === by.session;
  return task.doneIn === by.tree && (by.evidence === undefined || task.evidence === by.evidence);
}

function closed(task: Task, intent: TickIntent): Task {
  const { unpushed: _wasQueued, ...open } = task;
  return {
    ...open,
    done: true,
    evidence: intent.evidence,
    doneAt: intent.at,
    ...(intent.session ? { doneBy: intent.session } : {}),
    doneIn: intent.tree,
    ...(intent.unpushed ? { unpushed: true } : {}),
  };
}

// The outbox hands back JSON; a malformed entry plans nothing rather than a guess.
export function readTickIntent(args: unknown): TickIntent | undefined {
  if (!isPlainObject(args)) return undefined;
  const text = (key: string) => (typeof args[key] === "string" && args[key] !== "" ? args[key] : undefined);
  const [spec, phase, task, evidence, at, tree] = ["spec", "phase", "task", "evidence", "at", "tree"].map(text);
  if (!spec || !phase || !task || !evidence || !at || !tree) return undefined;
  const { session, unpushed } = args;
  if ((session !== undefined && typeof session !== "string") || (unpushed !== undefined && typeof unpushed !== "boolean")) return undefined;
  const approval = readApproval(args.approval);
  if (approval === null) return undefined;
  return { spec, phase, task, evidence, at, tree, ...(session === undefined ? {} : { session }), ...(unpushed === undefined ? {} : { unpushed }), ...(approval ? { approval } : {}) };
}

// null: present but malformed.
function readApproval(value: unknown): QuestionAnswer | undefined | null {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) return null;
  const { text, by, at } = value;
  return typeof text === "string" && typeof by === "string" && typeof at === "string" && text && by && at ? { text, by, at } : null;
}
