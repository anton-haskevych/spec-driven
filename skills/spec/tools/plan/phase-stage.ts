import { allTasksDone, countTasks } from "../core/phase-entry";
import type { PhaseDoc, Task } from "./docs/phase-doc";
import type { PrDoc } from "./docs/pr-doc";

// Where a joined phase is, computed and never stored (design.md → Phase state). `done` is a task phase's end.
export type PhaseStage = "todo" | "doing" | "built" | "merged" | "deployed" | "done";

const PUSHED = /\bon origin\/\S+/;

export function phaseStage(phase: PhaseDoc, pr: PrDoc | undefined, held: boolean): PhaseStage {
  if (phase.deployed !== undefined) return "deployed";
  if (allTasksDone(countTasks(phase.tasks))) return finishedStage(phase, pr);
  return held || startedOnABranch(phase, phase.tasks) ? "doing" : "todo";
}

function finishedStage(phase: PhaseDoc, pr: PrDoc | undefined): PhaseStage {
  if (!phase.code) return "done";
  return pr?.state === "merged" ? "merged" : "built";
}

// A box ticked with no pushed commit (session S44) isn't work anyone can pick up; a task phase's evidence
// is a link or a date, so any done task starts it.
function startedOnABranch(phase: PhaseDoc, tasks: readonly Task[]): boolean {
  return tasks.some((task) => task.done && (!phase.code || PUSHED.test(task.evidence ?? "")));
}
