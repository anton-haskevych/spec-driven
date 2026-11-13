import { phaseStage } from "../plan/phase-stage";
import { DEFAULT_PR_GROUP, prGroupOf, type PrDoc } from "../plan/docs/pr-doc";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import type { JoinedPlan } from "../plan/state-source";
import type { PhaseActivity } from "./activity";
import { rowKey } from "./phase-keys";

export interface BranchTree {
  path: string;
  branch?: string;
}

const ON_BRANCH = /\bon origin\/(\S+)/;

// A joined spec has one copy, so its trees' boxes say nothing: its phase stage does. A task closed
// `on origin/<branch>` puts its phase in progress in the tree on that branch; join's evidence (a bare sha)
// names no tree. A built phase stays in flight, in its PR group's tree, until its PR merges; one finished
// before the join (no PR document, or none opened and no pushed task) is history, not work in flight.
export function joinedActivity(plans: readonly JoinedPlan[], trees: readonly BranchTree[], prDocs: (spec: string) => readonly PrDoc[] | undefined = () => undefined): Map<string, PhaseActivity> {
  const pathOf = new Map(trees.flatMap((tree) => (tree.branch ? [[tree.branch, tree.path] as const] : [])));
  const activity = new Map<string, PhaseActivity>();
  for (const { spec, phases } of plans) {
    const docs = prDocs(spec.name);
    for (const phase of phases) {
      const group = prGroupOf(phase);
      const pr = docs?.find((doc) => doc.group === group);
      const stage = phaseStage(phase, pr, false);
      const key = rowKey({ spec: spec.name, phase: phase.id });
      if (stage === "doing") {
        const paths = treesOfTasks(phase, pathOf);
        if (paths.length > 0) activity.set(key, { tickedIn: [], wipIn: paths });
      }
      if (stage === "built" && pr && (pr.state !== "not-opened" || pushedOnABranch(phase))) {
        const path = pathOf.get(pr.branch);
        activity.set(key, { tickedIn: path ? [path] : [], wipIn: [], built: { prGroup: group, prNotOpened: pr.state === "not-opened" } });
      }
    }
  }
  return activity;
}

export function shownPrGroup(group: string): string | undefined {
  return group === DEFAULT_PR_GROUP ? undefined : group;
}

function pushedOnABranch(phase: PhaseDoc): boolean {
  return phase.tasks.some((task) => ON_BRANCH.test(task.evidence ?? ""));
}

function treesOfTasks(phase: PhaseDoc, pathOf: ReadonlyMap<string, string>): string[] {
  const paths = phase.tasks.flatMap((task) => {
    const branch = task.done ? ON_BRANCH.exec(task.evidence ?? "")?.[1] : undefined;
    const path = branch === undefined ? undefined : pathOf.get(branch);
    return path === undefined ? [] : [path];
  });
  return [...new Set(paths)];
}
