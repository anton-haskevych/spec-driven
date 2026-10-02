import type { Git } from "../core/git";
import type { Result } from "../core/result";
import type { SpecState } from "../core/spec-state";
import type { LiveSession } from "../sessions/live";
import { loadWorkspaces } from "../workspaces/list";
import { fetchClaims } from "./remote";
import { claimStatus, type ClaimContext, type HeldClaim } from "./rules";
import { claimsDir, loadClaims, type Claim } from "./store";

// An unreadable worktree list counts every claimed worktree as present: no claim reads gone by accident.
export function claimContext(git: Git, sessions: Result<LiveSession[]>, baseStates: ReadonlyMap<string, SpecState>, claims: readonly Claim[]): ClaimContext {
  const worktrees = loadWorkspaces(git);
  const paths = worktrees.ok ? worktrees.value.map((worktree) => worktree.path) : claims.map((claim) => claim.workspace);
  return { sessions, worktrees: new Set(paths), baseStates };
}

export function heldClaims(git: Git, sessions: Result<LiveSession[]>, baseStates: ReadonlyMap<string, SpecState>): HeldClaim[] {
  const dir = claimsDir(git);
  if (!dir.ok) return [];
  const { claims } = loadClaims(dir.value);
  if (claims.length === 0) return [];
  const context = claimContext(git, sessions, baseStates, claims);
  return claims.map((claim) => ({ claim, status: claimStatus(claim, context) }));
}

// Other machines' claims. A ref whose session also has a claim file here is this machine's own mirror.
export function remoteHeldClaims(git: Git, local: readonly HeldClaim[]): HeldClaim[] {
  if (!git.out(["remote", "get-url", "origin"]).ok) return [];
  const fetched = fetchClaims(git);
  if (!fetched.ok) return [];
  const mirrored = new Set(local.map((held) => held.claim.sessionId));
  return fetched.value.filter((remote) => !mirrored.has(remote.claim.sessionId)).map(({ claim, holder }) => ({ claim, status: "remote", holder }));
}
