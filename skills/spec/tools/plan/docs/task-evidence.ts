import type { Task } from "./phase-doc";

// A code tick records `<sha> on origin/<branch>[ · note]` (plan/record-tick.ts); join records a bare sha.
const LEADING_SHA = /^([0-9a-f]{7,40})(?:\s|$)/;

// The commit a phase's work last reached origin with: the newest done task whose evidence starts with a sha.
export function recordedCommit(tasks: readonly Task[]): string | undefined {
  return tasks
    .filter((task) => task.done)
    .map((task) => LEADING_SHA.exec(task.evidence ?? "")?.[1])
    .findLast((sha) => sha !== undefined);
}
