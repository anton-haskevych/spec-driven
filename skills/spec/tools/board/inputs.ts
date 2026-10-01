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

export interface BoardInputs {
  repo: string;
  base: BaseRef;
  nodes: ReadonlyMap<string, SpecNode>;
  states: ReadonlyMap<string, SpecState>;
  stages: ReadonlyMap<string, SpecStage>;
  counts: { merged: number; unknownBase: number; unreadable: number; duplicates: string[] };
  backlogCount: number;
}
