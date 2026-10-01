import type { Priority } from "../core/schedule";

export const BOARD_VERSION = 1;

export type Target = { workspace: string } | { newWorktree: string };

interface RowBase {
  spec: string;
  phase?: string;
  target?: Target;
}

export type SessionCell = { status: "busy" | "idle"; since: string } | { status: "closed" | "unknown" };

export interface PrCell {
  number: number;
  listed: boolean;
  draft?: boolean;
  failing?: number;
  pending?: number;
}

export type FlightNext = "executing" | "fix CI" | "merge" | "ticked on branch, not merged" | "uncommitted";

export interface FlightRow extends RowBase {
  prGroup?: string;
  workspace?: string;
  // Further worktrees where the same phase is ticked.
  alsoIn?: string[];
  session?: SessionCell;
  pr?: PrCell;
  next: FlightNext;
}

export type NextStep = "prep" | "create" | "execute";

export interface ReadyRow extends RowBase {
  next: NextStep;
  prGroup?: string;
  priority?: Priority;
  due?: string;
  overdue: boolean;
  updated?: string;
  unblocks: number;
  safe: boolean;
  // Ready only in this worktree, where the phases it needs are ticked but not merged.
  readyIn?: { workspace: string; needs: string[] };
  // The spec exists only on this branch.
  onlyOn?: string;
  sharesWith?: string[];
}

export interface BlockedRow extends RowBase {
  reasons: string[];
}

export type AttentionRow =
  | { kind: "overdue"; spec: string; phase?: string; due: string }
  | { kind: "deploy"; spec: string; phase: string; waiting: string[] };

export type BaseMode = "fetched" | "offline" | "busy" | "local";

export interface Board {
  version: typeof BOARD_VERSION;
  repo: string;
  generatedAt: string;
  here: string;
  mainCheckout?: string;
  base: { branch: string; sha: string; date: string; mode: BaseMode; reason?: string };
  lanes: { inFlight: FlightRow[]; ready: ReadyRow[]; blocked: BlockedRow[]; needsYou: AttentionRow[] };
  footer: {
    merged: number;
    unknownBase: number;
    unreadable: number;
    paused: number;
    backlog: number;
    duplicates: string[];
    prs?: string;
    sessions?: string;
  };
}
