import type { Result } from "../core/result";
import type { SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";

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
  counts: { merged: number; unknownBase: number; unreadable: number; duplicates: string[] };
  backlogCount: number;
}
