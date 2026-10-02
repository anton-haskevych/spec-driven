import type { SpecState } from "../core/spec-state";
import { describeHolder, findTree, treeHolder } from "../trees/find";
import { treeName } from "../trees/naming";
import type { PhaseActivity } from "./activity";
import type { BoardInputs } from "./inputs";
import type { Target } from "./model";

export interface TreeTarget {
  target: Target;
  // describeHolder text: another session works in the group's tree.
  busy?: string;
}

const NO_SESSIONS = { ok: false, reason: "--local" } as const;

// Every phase of one PR group runs in the group's one tree, never a tree per phase.
export function treeTarget(state: SpecState, phaseId: string, inputs: BoardInputs, activity: ReadonlyMap<string, PhaseActivity>): TreeTarget {
  const spec = state.spec.name;
  const prGroup = state.phases.find((phase) => phase.id === phaseId)?.edges.pr;
  const name = treeName(spec, prGroup);
  const phases = state.phases.filter((phase) => phase.edges.pr === prGroup).map((phase) => phase.id);
  const tree = findTree(name, { spec, phases }, { worktrees: inputs.workspaces, claims: inputs.claims, activity, defaultBranch: inputs.base.branch });
  return tree ? workspaceTarget(tree.path, inputs) : { target: { newWorktree: name.folder } };
}

export function workspaceTarget(path: string, inputs: BoardInputs): TreeTarget {
  const sessions = inputs.sessions === "local" ? NO_SESSIONS : inputs.sessions;
  const holder = treeHolder(path, { sessions, claims: inputs.claims, worktreePaths: inputs.workspaces.map((workspace) => workspace.path) });
  return { target: { workspace: path }, ...(holder ? { busy: describeHolder(holder) } : {}) };
}
