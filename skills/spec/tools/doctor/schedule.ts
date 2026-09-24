import { join } from "node:path";
import { isOverdue } from "../core/schedule";
import type { SpecState } from "../core/spec-state";
import { isFinished, type SpecNode } from "../graph/nodes";
import { error, warning, type Issue } from "./issue";

export function phaseScheduleIssues(state: SpecState, today: string, onlyPointer?: string): Issue[] {
  return state.phases
    .filter((phase) => !onlyPointer || phase.pointer === onlyPointer)
    .flatMap((phase) => {
      const file = join(state.spec.dir, phase.pointer);
      const late = !phase.done && isOverdue(phase.schedule.due, today);
      return [
        ...(late ? [warning(file, `Phase ${phase.id} was due ${phase.schedule.due} and is still open`)] : []),
        ...phase.schedule.problems.map((problem) => error(file, problem)),
      ];
    });
}

export function specOverdueIssues(file: string, node: SpecNode | undefined, today: string): Issue[] {
  if (!node || isFinished(node) || !isOverdue(node.meta.due, today)) return [];
  return [warning(file, `spec was due ${node.meta.due} and is not finished`)];
}
