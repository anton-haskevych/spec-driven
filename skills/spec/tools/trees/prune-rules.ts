import type { PrDoc } from "../plan/docs/pr-doc";
import { laneOf, type SpecLayout } from "../pr/groups";
import type { Workspace } from "../workspaces/list";

export interface TreeFacts {
  worktree: Workspace;
  // HEAD is an ancestor of origin/<default>: merged or never diverged.
  inBase: boolean;
  // Under the root `trees place` uses. Folders other tools make (an Orca chat's, a Codex task's) are theirs to remove.
  placed: boolean;
  // A commit was made on the branch here, or it was pushed under its own name: base ancestry then means merged,
  // not a fresh branch that never left the default one.
  carriesWork: boolean;
  busy?: string;
  lane?: LaneTreeFacts;
}

// A tree on a lane branch (oversee-one-spec), or on a group whose document reads merged.
export interface LaneInfo {
  spec: string;
  // Set while the spec is in spec-branch mode: feat/<spec>.
  specBranch?: string;
  laneOpen: boolean;
  // The lane document's PR, once it reads merged (Phase 5 copies the final PR there).
  mergedPr?: number;
}

export interface LaneTreeFacts extends LaneInfo {
  // origin/<lane> is an ancestor of origin/feat/<spec>.
  inSpecBranch: boolean;
  // Every commit the tree holds beyond origin/<lane> and origin/<default> touches spec docs only.
  onlySpecDocsBeyond: boolean;
}

export interface MergedHead {
  number: number;
  head: string;
}

export interface PruneCandidate {
  path: string;
  branch?: string;
  evidence: string;
}

// Squash merges leave the branch outside base, so a merged PR whose head is this tree's HEAD counts too.
// Either way every local commit is on origin: nothing unpushed is ever pruned. Edits aren't checked here
// (a clean check stats every file of every tree, ~9 s on CRM); `worktree remove` refuses an edited tree.
export function pruneCandidates(trees: readonly TreeFacts[], mergedHeads: ReadonlyMap<string, readonly MergedHead[]> | undefined, defaultBranch: string): PruneCandidate[] {
  return trees.flatMap(({ worktree, inBase, placed, carriesWork, busy, lane }) => {
    if (busy || !placed) return [];
    const branch = worktree.branch;
    const pr = branch ? mergedHeads?.get(branch)?.find((merged) => merged.head === worktree.head) : undefined;
    const evidence = inBase && carriesWork ? `in origin/${defaultBranch}` : pr ? `#${pr.number} merged` : lane && laneEvidence(lane);
    return evidence ? [{ path: worktree.path, ...(branch ? { branch } : {}), evidence }] : [];
  });
}

// A lane's own commits beyond its pushed name may only be spec docs, which publish-docs already landed on main.
function laneEvidence(lane: LaneTreeFacts): string | undefined {
  if (!lane.onlySpecDocsBeyond) return undefined;
  if (lane.mergedPr !== undefined) return `#${lane.mergedPr} merged`;
  return lane.specBranch && lane.inSpecBranch && !lane.laneOpen ? `lane in origin/${lane.specBranch}` : undefined;
}

// Never by ancestry against main alone (squash merges): a lane is found through its spec's layout and documents.
export function laneBranches(layouts: ReadonlyMap<string, SpecLayout>, prDocs: (spec: string) => readonly PrDoc[] | undefined): Map<string, LaneInfo> {
  const lanes = new Map<string, LaneInfo>();
  for (const [spec, layout] of layouts) {
    const docs = prDocs(spec) ?? [];
    for (const [group, { branch, phases }] of layout.groups) {
      const doc = docs.find((candidate) => candidate.group === group);
      const mergedPr = doc?.state === "merged" ? doc.number : undefined;
      const specBranch = laneOf(layout, branch) === undefined ? undefined : layout.finalPr?.head;
      if (specBranch === undefined && mergedPr === undefined) continue;
      lanes.set(branch, { spec, ...(specBranch ? { specBranch } : {}), laneOpen: phases.some((phase) => !phase.done), ...(mergedPr === undefined ? {} : { mergedPr }) });
    }
  }
  return lanes;
}
