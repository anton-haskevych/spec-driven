import type { HeldClaim } from "../claims/rules";
import type { Result } from "../core/result";
import type { PrRow } from "../pr/checks/rollup";
import type { PrDoc } from "../plan/docs/pr-doc";
import type { LiveSession } from "../sessions/live";
import type { SessionDoc } from "../sessions/session-doc";
import type { SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import type { PlanSource } from "../plan/read-plans";
import type { PhaseActivity } from "./activity";

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
  // Read once per command: joined specs come from the record, the rest from files.
  plans: PlanSource;
  // Joined specs' phases in progress, from task evidence; phaseActivity merges it.
  joinedActivity: ReadonlyMap<string, PhaseActivity>;
  workspaces: readonly WorkspaceView[];
  // Every `git worktree list` path, live or not: sessions are scoped to this repo by these.
  worktreePaths: readonly string[];
  counts: { merged: number; unknownBase: number; unreadable: number; duplicates: string[] };
  backlogCount: number;
  // "local": --local skipped the source.
  sessions: Result<LiveSession[]> | "local";
  claims: readonly HeldClaim[];
  prs: Result<PrRow[]> | "local";
  // Spec → its PR documents as GitHub has them now; only specs on layout 2.
  prDocs: ReadonlyMap<string, readonly PrDoc[]>;
  // Spec → PR numbers its pr-opening.md links, oldest first.
  prLinks: ReadonlyMap<string, readonly number[]>;
  // Session documents from the record, newest write first; empty with the board off.
  sessionDocs: readonly SessionDoc[];
  // This machine's name as session documents carry it: another host's sessions are the other machine's.
  thisHost: string;
  ownSessionId?: string;
}
