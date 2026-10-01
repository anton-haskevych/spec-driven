import type { Workspace } from "./list";

export interface AheadBehind {
  ahead: number;
  behind: number;
}

export type WorkspaceKind = "merged" | "live" | "unknown-base" | "unreadable";

export interface ClassifiedWorkspace {
  workspace: Workspace;
  kind: WorkspaceKind;
  // Has commits that are not on base, so its committed spec-doc changes are worth a diff.
  aheadOfBase: boolean;
}

export interface WorkspaceFacts {
  aheadBehind: ReadonlyMap<string, AheadBehind>;
  unmergedDetached: ReadonlySet<string>;
  noMergeBase: ReadonlySet<string>;
  forceLive: ReadonlySet<string>;
}

export const UNKNOWN_BASE_AHEAD = 1000;

const AHEAD_BEHIND_LINE = /^(\S+) (\d+) (\d+)$/;

// `for-each-ref --format='%(refname:short) %(ahead-behind:<sha>)'`
export function parseAheadBehind(output: string): Map<string, AheadBehind> {
  const counts = new Map<string, AheadBehind>();
  for (const line of output.split("\n")) {
    const match = AHEAD_BEHIND_LINE.exec(line.trim());
    if (match) counts.set(match[1]!, { ahead: Number(match[2]), behind: Number(match[3]) });
  }
  return counts;
}

// A shallow clone reports every commit of a branch whose merge base it lacks as "ahead".
export function suspectNoMergeBase(workspaces: readonly Workspace[], aheadBehind: ReadonlyMap<string, AheadBehind>): Workspace[] {
  return workspaces.filter((workspace) => !workspace.prunable && (aheadOf(workspace, aheadBehind) ?? 0) > UNKNOWN_BASE_AHEAD);
}

export function classifyWorkspaces(workspaces: readonly Workspace[], facts: WorkspaceFacts): ClassifiedWorkspace[] {
  return workspaces.filter((workspace) => !workspace.prunable).map((workspace) => classify(workspace, facts));
}

function classify(workspace: Workspace, facts: WorkspaceFacts): ClassifiedWorkspace {
  if (facts.noMergeBase.has(workspace.path)) return { workspace, kind: "unknown-base", aheadOfBase: false };
  const aheadOfBase = hasCommitsOffBase(workspace, facts);
  if (aheadOfBase === undefined) return { workspace, kind: "unreadable", aheadOfBase: false };
  const live = aheadOfBase || workspace.isMain || facts.forceLive.has(workspace.path);
  return { workspace, kind: live ? "live" : "merged", aheadOfBase };
}

function hasCommitsOffBase(workspace: Workspace, facts: WorkspaceFacts): boolean | undefined {
  if (!workspace.head) return undefined;
  if (workspace.detached) return facts.unmergedDetached.has(workspace.head);
  const ahead = aheadOf(workspace, facts.aheadBehind);
  return ahead === undefined ? undefined : ahead > 0;
}

function aheadOf(workspace: Workspace, aheadBehind: ReadonlyMap<string, AheadBehind>): number | undefined {
  return workspace.branch === undefined ? undefined : aheadBehind.get(workspace.branch)?.ahead;
}
