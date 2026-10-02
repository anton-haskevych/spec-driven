import type { PhaseActivity } from "../board/activity";
import { rowKey } from "../board/phase-keys";
import { holderName, type HeldClaim } from "../claims/rules";
import type { Result } from "../core/result";
import type { LiveSession } from "../sessions/live";
import type { Workspace } from "../workspaces/list";
import { ownerOf } from "../workspaces/owner";
import type { TreeName } from "./naming";

export interface GroupPhases {
  spec: string;
  // Every phase id of the spec in the same PR group as the phase being placed.
  phases: readonly string[];
}

// A worktree as the board sees it (a live view) or as `git worktree list` does.
export type TreeRef = Pick<Workspace, "path" | "branch"> & { prunable?: boolean };

export interface FindInputs<T extends TreeRef = TreeRef> {
  worktrees: readonly T[];
  claims: readonly HeldClaim[];
  activity: ReadonlyMap<string, PhaseActivity>;
  defaultBranch: string;
}

const HOLDS_A_TREE: ReadonlySet<HeldClaim["status"]> = new Set(["live", "unknown", "closed"]);
const BLOCKS_A_TREE: ReadonlySet<HeldClaim["status"]> = new Set(["live", "unknown"]);

// By branch first. Trees cut before this rule (hook branches, renamed ones) are found by what they hold.
export function findTree<T extends TreeRef>(name: TreeName, group: GroupPhases, inputs: FindInputs<T>): T | undefined {
  const present = inputs.worktrees.filter((worktree) => !worktree.prunable);
  const byBranch = present.find((worktree) => worktree.branch === name.branch);
  if (byBranch) return byBranch;
  const candidates = present.filter((worktree) => worktree.branch !== inputs.defaultBranch);
  const holding = [...claimedPaths(group, inputs.claims), ...activePaths(group, inputs.activity)];
  return holding.map((path) => candidates.find((worktree) => worktree.path === path)).find((worktree) => worktree !== undefined);
}

// One live session per tree. Unknown liveness counts as live, so a broken sessions source never shares one.
export function busyHolder(tree: string, sessions: Result<LiveSession[]>, claims: readonly HeldClaim[], worktreePaths: readonly string[], ownSessionId?: string): string | undefined {
  const claimed = claims.find(({ claim, status }) => BLOCKS_A_TREE.has(status) && claim.workspace === tree && claim.sessionId !== ownSessionId);
  if (claimed) return `after ${claimed.claim.spec} ${claimed.claim.phase} (${holderName(claimed.claim)})`;
  if (!sessions.ok) return undefined;
  const inside = sessions.value.find((session) => session.sessionId !== ownSessionId && ownerOf(session.cwd, worktreePaths) === tree);
  return inside && `after ${inside.name ?? `session ${inside.sessionId.slice(0, 8)}`}`;
}

function claimedPaths(group: GroupPhases, claims: readonly HeldClaim[]): string[] {
  return claims.filter(({ claim, status }) => HOLDS_A_TREE.has(status) && claim.spec === group.spec && group.phases.includes(claim.phase)).map(({ claim }) => claim.workspace);
}

function activePaths(group: GroupPhases, activity: ReadonlyMap<string, PhaseActivity>): string[] {
  return group.phases.flatMap((phase) => {
    const entry = activity.get(rowKey({ spec: group.spec, phase }));
    return entry ? [...entry.wipIn, ...entry.tickedIn] : [];
  });
}
