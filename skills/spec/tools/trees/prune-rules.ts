import type { Workspace } from "../workspaces/list";

export interface TreeFacts {
  worktree: Workspace;
  // HEAD is an ancestor of origin/<default>: merged or never diverged.
  inBase: boolean;
  clean: boolean;
  busy?: string;
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
// Either way every local commit is on origin: nothing unpushed is ever pruned.
export function pruneCandidates(trees: readonly TreeFacts[], mergedHeads: ReadonlyMap<string, readonly MergedHead[]> | undefined, defaultBranch: string): PruneCandidate[] {
  return trees.flatMap(({ worktree, inBase, clean, busy }) => {
    if (!clean || busy) return [];
    const branch = worktree.branch;
    const pr = branch ? mergedHeads?.get(branch)?.find((merged) => merged.head === worktree.head) : undefined;
    const evidence = inBase ? `in origin/${defaultBranch}` : pr && `#${pr.number} merged`;
    return evidence ? [{ path: worktree.path, ...(branch ? { branch } : {}), evidence }] : [];
  });
}
