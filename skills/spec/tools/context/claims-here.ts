import { claimsDir, loadClaims } from "../claims/store";
import { gitAt } from "../core/git";
import { systemRunner } from "../core/run";
import { canonicalPath, loadWorkspaces } from "../workspaces/list";
import { ownerOf } from "../workspaces/owner";

export interface ClaimHere {
  spec: string;
  phase: string;
}

export type ClaimsHereReader = (projectDir: string) => ClaimHere[];

// Claims record the worktree they were taken in; a session started there is working on that phase.
export const systemClaimsHere: ClaimsHereReader = (projectDir) => {
  const git = gitAt(projectDir, systemRunner);
  const dir = claimsDir(git);
  const worktrees = loadWorkspaces(git);
  if (!dir.ok || !worktrees.ok) return [];
  const here = ownerOf(canonicalPath(projectDir), worktrees.value.map((worktree) => worktree.path));
  if (!here) return [];
  return loadClaims(dir.value).claims.filter((claim) => claim.workspace === here).map(({ spec, phase }) => ({ spec, phase }));
};
