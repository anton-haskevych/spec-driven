import type { Git } from "../core/git";
import { isSpecDocPath } from "../core/spec-folders";
import type { LaneInfo, LaneTreeFacts } from "./prune-rules";

export interface BranchHead {
  branch: string;
  head: string;
}

// An unreadable answer keeps the tree: not in feat/<spec>, not only spec docs.
export function laneTreeFacts(git: Git, tree: BranchHead, lane: LaneInfo, defaultBranch: string): LaneTreeFacts {
  const inSpecBranch = lane.specBranch !== undefined && git.run(["merge-base", "--is-ancestor", `origin/${tree.branch}`, `origin/${lane.specBranch}`]).code === 0;
  return { ...lane, inSpecBranch, onlySpecDocsBeyond: onlySpecDocsBeyond(git, tree, defaultBranch) };
}

// The tree's own commits: not on its lane's pushed name and not on the default branch (the docs snapshot is).
function onlySpecDocsBeyond(git: Git, tree: BranchHead, defaultBranch: string): boolean {
  const beyond = git.run(["log", "--no-merges", "--format=", "--name-only", "-z", tree.head, `^origin/${tree.branch}`, `^origin/${defaultBranch}`]);
  if (beyond.code !== 0) return false;
  const paths = beyond.stdout.split("\0").map((path) => path.trim()).filter((path) => path !== "");
  return paths.every(isSpecDocPath);
}
