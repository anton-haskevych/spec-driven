import type { Task } from "./docs/phase-doc";
import { taskKey, type EntryTask } from "./entry-tasks";

// One copy of a phase's deliverables: `where` reads "on main" or "in tree pr-a".
export interface TaskCopy {
  where: string;
  head: string;
  tasks: readonly EntryTask[];
}

export interface MatchedTasks {
  tasks: Task[];
  recorded: string[];
  left: string[];
}

const EVIDENCE_SEPARATOR = " — ";

// Ids come from the primary copy's order. Other copies are matched by text, never by position, so a tree
// that inserted a task can't tick the wrong one. Done anywhere is done.
export function matchPhaseTasks(phaseId: string, primary: TaskCopy, others: readonly TaskCopy[]): MatchedTasks {
  const tasks = primary.tasks.map((entry, index) => taskFrom(`${phaseId}.${index + 1}`, entry, primary.head));
  const keys = primary.tasks.map((entry) => taskKey(entry.text));
  const recorded: string[] = [];
  const left: string[] = [];
  for (const other of others) {
    const ticked: string[] = [];
    for (const entry of other.tasks) {
      const matches = matchingIndexes(keys, entry);
      const [only] = matches;
      const match = matches.length === 1 && only !== undefined ? tasks[only] : undefined;
      if (matches.length === 0) left.push(`phase ${phaseId}: "${entry.text}" ${other.where} matches no task ${primary.where}; not added`);
      else if (matches.length > 1) left.push(`phase ${phaseId}: "${entry.text}" ${other.where} matches ${matches.length} tasks (${matches.map((index) => tasks[index]?.id).join(", ")}); left open`);
      else if (match && only !== undefined && entry.done && !match.done) {
        tasks[only] = { ...match, done: true, evidence: entry.evidence ?? other.head };
        ticked.push(match.id);
      }
    }
    if (ticked.length > 0) recorded.push(recordedLine(phaseId, ticked, tasks, primary, other));
  }
  return { tasks, recorded, left };
}

function taskFrom(id: string, entry: EntryTask, head: string): Task {
  return { id, text: entry.text, done: entry.done, ...(entry.done ? { evidence: entry.evidence ?? head } : {}), ...(entry.gate ? { gate: true } : {}) };
}

// A ticked task may carry a note after ` — ` that isn't evidence; it still names the same task.
function matchingIndexes(keys: readonly string[], entry: EntryTask): number[] {
  const at = entry.text.lastIndexOf(EVIDENCE_SEPARATOR);
  const candidates = [entry.text, ...(entry.done && at !== -1 ? [entry.text.slice(0, at)] : [])];
  for (const candidate of candidates) {
    const key = taskKey(candidate);
    const matches = keys.flatMap((other, index) => (other === key ? [index] : []));
    if (matches.length > 0) return matches;
  }
  return [];
}

function recordedLine(phaseId: string, ticked: readonly string[], tasks: readonly Task[], primary: TaskCopy, other: TaskCopy): string {
  const outcome = `recorded as done (${other.head.slice(0, 7)})`;
  if (tasks.every((task) => task.done)) return `phase ${phaseId} is done ${other.where} and open ${primary.where}; ${outcome}`;
  return `phase ${phaseId}: ${ticked.join(", ")} done ${other.where} and open ${primary.where}; ${outcome}`;
}
