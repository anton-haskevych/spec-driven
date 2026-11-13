import type { ReadSpecFile } from "../core/spec-state";
import type { RecordOp } from "../record/plan-writes";
import type { RecordPlan } from "../record/write";
import type { PhaseDoc, Task } from "./docs/phase-doc";
import { entryTasks, taskKey, type EntryTask } from "./entry-tasks";
import { matchingIndexes } from "./join-tasks";
import { phaseDocPath } from "./kinds";
import { readJoinedPlan } from "./state-source";

// This tree's copy of a joined spec: its phase files as the branch has them.
export interface TreeCopy {
  spec: string;
  read: ReadSpecFile;
  tree: string;
  head: string;
  at: string;
  session?: string;
}

// Ticks made on a branch before the join (typically on the other machine) reach the record: a box ticked
// here and open there is done, matched by text as join matches, with the box's evidence or this tree's head.
export function fromTreePlan(copy: TreeCopy, see: (ticked: string[]) => void = () => {}): RecordPlan {
  return (view) => {
    const plan = readJoinedPlan(view, copy.spec);
    if (!plan) return { refused: `${copy.spec} is not on the board; run join ${copy.spec} first` };
    const ticked: string[] = [];
    const ops: RecordOp[] = plan.phases.flatMap((phase) => {
      const tasks = withTreeTicks(phase, entryTasks(copy.read(phase.file) ?? ""), copy);
      const closed = tasks.filter((task, index) => task.done && !phase.tasks[index]?.done).map((task) => task.id);
      ticked.push(...closed);
      return closed.length === 0 ? [] : [{ op: "update" as const, path: phaseDocPath(copy.spec, phase.id), patch: { tasks } }];
    });
    see(ticked);
    return ops.length === 0 ? { unchanged: true } : { ops, message: `record: ${copy.spec} ticks from tree ${copy.tree}` };
  };
}

function withTreeTicks(phase: PhaseDoc, entries: readonly EntryTask[], copy: TreeCopy): Task[] {
  const keys = phase.tasks.map((task) => taskKey(task.text));
  const tasks = [...phase.tasks];
  for (const entry of entries.filter((each) => each.done)) {
    const matches = matchingIndexes(keys, entry);
    const [only] = matches;
    const task = matches.length === 1 && only !== undefined ? tasks[only] : undefined;
    if (!task || task.done || only === undefined) continue;
    tasks[only] = { ...task, done: true, evidence: entry.evidence ?? copy.head, doneAt: copy.at, ...(copy.session ? { doneBy: copy.session } : {}), doneIn: copy.tree };
  }
  return tasks;
}
