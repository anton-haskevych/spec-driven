import type { HeldClaim } from "../claims/rules";
import type { Result } from "../core/result";
import type { PrRow } from "../pr/checks/rollup";
import type { LiveSession } from "../sessions/live";
import type { SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";

export type { HeldClaim };

export interface BaseRef {
  branch: string;
  sha: string;
  date: string;
  fetch: Result<void> | "local";
}

export type SpecStage = "prep" | "create";

// A live worktree's own view of the specs it changed. `branchOnly` holds the nodes of specs base lacks.
export interface WorkspaceView {
  path: string;
  branch?: string;
  isMain: boolean;
  states: ReadonlyMap<string, SpecState>;
  branchOnly: ReadonlyMap<string, SpecNode>;
}

export interface BoardInputs {
  repo: string;
  currentPath: string;
  base: BaseRef;
  nodes: ReadonlyMap<string, SpecNode>;
  states: ReadonlyMap<string, SpecState>;
  stages: ReadonlyMap<string, SpecStage>;
  workspaces: readonly WorkspaceView[];
  // Every `git worktree list` path, live or not: sessions are scoped to this repo by these.
  worktreePaths: readonly string[];
  counts: { merged: number; unknownBase: number; unreadable: number; duplicates: string[] };
  backlogCount: number;
  // "local": --local skipped the source.
  sessions: Result<LiveSession[]> | "local";
  claims: readonly HeldClaim[];
  prs: Result<PrRow[]> | "local";
  // Spec → PR numbers its pr-opening.md links, oldest first.
  prLinks: ReadonlyMap<string, readonly number[]>;
  ownSessionId?: string;
}
