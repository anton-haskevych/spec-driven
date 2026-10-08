import type { PhaseActivity } from "../board/activity";
import { rowKey } from "../board/phase-keys";
import { holderName, type HeldClaim } from "../claims/rules";
import type { Result } from "../core/result";
import { sessionsByWorkspace } from "../sessions/by-workspace";
import { sessionLabel } from "../sessions/label";
import type { LiveSession } from "../sessions/live";
import type { Workspace } from "../workspaces/list";
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

export interface TreeView {
  sessions: Result<LiveSession[]>;
  claims: readonly HeldClaim[];
  worktreePaths: readonly string[];
  ownSessionId?: string;
}

export type TreeHolder =
  | { kind: "claim"; spec: string; phase: string; who: string }
  | { kind: "mid-task"; who: string }
  | { kind: "uncommitted"; who: string };

// Held by work, not by an open tab: a session that handed off may stay open to launch the next phase.
// Unreadable sessions leave it to claims, whose unknown liveness already blocks.
export function treeHolder(tree: string, view: TreeView, hasUncommittedChanges?: () => boolean): TreeHolder | undefined {
  const claimed = blockingClaim(tree, view);
  if (claimed) return { kind: "claim", spec: claimed.claim.spec, phase: claimed.claim.phase, who: holderName(claimed.claim) };
  const others = sessionsIn(tree, view);
  const working = others.find((session) => session.status === "busy");
  if (working) return { kind: "mid-task", who: sessionLabel(working.name, working.sessionId) };
  const idle = others[0];
  return idle && hasUncommittedChanges?.() ? { kind: "uncommitted", who: sessionLabel(idle.name, idle.sessionId) } : undefined;
}

export function describeHolder(holder: TreeHolder): string {
  switch (holder.kind) {
    case "claim":
      return `after ${holder.spec} ${holder.phase} (${holder.who})`;
    case "mid-task":
      return `${holder.who} is mid-task there`;
    case "uncommitted":
      return `${holder.who} left uncommitted changes there`;
  }
}

// Prune deletes the folder, so anyone at all keeps it, and so does not being able to tell.
export function treeOccupant(tree: string, view: TreeView): string | undefined {
  const claimed = blockingClaim(tree, view);
  if (claimed) return describeHolder({ kind: "claim", spec: claimed.claim.spec, phase: claimed.claim.phase, who: holderName(claimed.claim) });
  if (!view.sessions.ok) return "sessions can't be read";
  const inside = sessionsIn(tree, view)[0];
  return inside && `${sessionLabel(inside.name, inside.sessionId)} is open there`;
}

function blockingClaim(tree: string, view: TreeView): HeldClaim | undefined {
  return view.claims.find(({ claim, status }) => BLOCKS_A_TREE.has(status) && claim.workspace === tree && claim.sessionId !== view.ownSessionId);
}

function sessionsIn(tree: string, view: TreeView): LiveSession[] {
  if (!view.sessions.ok) return [];
  const inTree = sessionsByWorkspace(view.sessions.value, view.worktreePaths).get(tree) ?? [];
  return inTree.filter((session) => session.sessionId !== view.ownSessionId);
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
