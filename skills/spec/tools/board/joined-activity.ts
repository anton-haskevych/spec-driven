import { phaseDocDone, type JoinedPlan } from "../plan/state-source";
import type { PhaseActivity } from "./activity";
import { rowKey } from "./phase-keys";

export interface BranchTree {
  path: string;
  branch?: string;
}

const ON_BRANCH = /\bon origin\/(\S+)/;

// A joined spec has one copy, so its trees' boxes say nothing: a task closed `on origin/<branch>` puts
// its open phase in progress in the tree on that branch. Join's evidence (a bare sha) names no tree.
export function joinedActivity(plans: readonly JoinedPlan[], trees: readonly BranchTree[]): Map<string, PhaseActivity> {
  const pathOf = new Map(trees.flatMap((tree) => (tree.branch ? [[tree.branch, tree.path] as const] : [])));
  const activity = new Map<string, PhaseActivity>();
  for (const { spec, phases } of plans) {
    for (const phase of phases.filter((doc) => !phaseDocDone(doc))) {
      const paths = phase.tasks.flatMap((task) => {
        const branch = task.done ? ON_BRANCH.exec(task.evidence ?? "")?.[1] : undefined;
        const path = branch === undefined ? undefined : pathOf.get(branch);
        return path === undefined ? [] : [path];
      });
      if (paths.length > 0) activity.set(rowKey({ spec: spec.name, phase: phase.id }), { tickedIn: [], wipIn: [...new Set(paths)] });
    }
  }
  return activity;
}
