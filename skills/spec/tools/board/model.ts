import type { Priority } from "../core/schedule";
import type { SessionStatus } from "../sessions/live";
import type { SpecStage } from "./inputs";

export const BOARD_VERSION = 1;

export type Target = { workspace: string } | { newWorktree: string };

interface RowBase {
  spec: string;
  phase?: string;
  target?: Target;
}

// "remote": another machine's claim; `since` is when it was claimed.
export type SessionCell = { status: SessionStatus | "remote"; since: string } | { status: "closed" | "unknown" };

export interface PrCell {
  number: number;
  listed: boolean;
  draft?: boolean;
  failing?: number;
  pending?: number;
  passing?: number;
  state?: "merged" | "closed";
}

export type FlightNext = "executing" | "fix CI" | "merge" | "ticked on branch, not merged" | "uncommitted";

export interface FlightRow extends RowBase {
  prGroup?: string;
  workspace?: string;
  // Further worktrees where the same phase is ticked.
  alsoIn?: string[];
  // The session name on the phase's claim.
  holder?: string;
  session?: SessionCell;
  // "unknown": gh couldn't list PRs.
  pr?: PrCell | "unknown";
  next: FlightNext;
}

export type NextStep = "prep" | "create" | "execute";

export interface ReadyRow extends RowBase {
  next: NextStep;
  // The spec's position in the FOCUS lane (1 = top); focus rows rank first.
  focus?: number;
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
  // `after <spec> <phase> (<session>)`: another session works in this row's tree.
  treeBusy?: string;
}

export interface BlockedRow extends RowBase {
  reasons: string[];
}

export type AttentionRow =
  | { kind: "overdue"; spec: string; phase?: string; due: string }
  | { kind: "deploy"; spec: string; phase: string; waiting: string[] }
  | { kind: "merge"; spec: string; phase?: string; prGroup?: string; pr: number }
  | { kind: "fix"; spec: string; phase?: string; prGroup?: string; pr: number; failing: number }
  | { kind: "claim"; spec: string; phase: string; holder: string }
  | { kind: "remote-claim"; spec: string; phase: string; holder: string; since: string }
  // Merged worktrees by ancestry; `trees prune` also finds squash-merged ones by their PR's head.
  | { kind: "prune"; trees: number };

// What a focus spec is doing now: the first kind that applies, in this order.
export type FocusNow =
  | { kind: "flight"; phases: string[]; next: FlightNext[] }
  | { kind: "ready"; phases: string[]; step: NextStep }
  | { kind: "deploy"; phases: string[] }
  | { kind: "blocked"; reason: string }
  | { kind: "paused" }
  // Finished on base, but a PR its pr-opening.md links is still open.
  | { kind: "merging"; pr: number }
  | { kind: "none" };

// A session on this machine, in this repo. `sub` and `phase` come from a launch title naming the row's spec.
export interface FocusSession {
  label: string;
  sub?: string;
  phase?: string;
  status: SessionStatus;
  since: string;
}

export interface FocusClaim {
  phase: string;
  since: string;
}

// One person's remote claims and open PRs on a focus spec. This machine's sessions stay on the row: they are always mine.
export interface FocusWork {
  person: string;
  mine: boolean;
  claims: FocusClaim[];
  prs: PrCell[];
}

export interface FocusRow {
  spec: string;
  rank: number;
  progress?: { done: number; total: number };
  stage?: SpecStage;
  due?: string;
  overdue: boolean;
  now: FocusNow;
  sessions: FocusSession[];
  work: FocusWork[];
  unattributedPrs: PrCell[];
}

export type BaseMode = "fetched" | "offline" | "busy" | "local";

export interface Board {
  version: typeof BOARD_VERSION;
  repo: string;
  generatedAt: string;
  here: string;
  // The git author name: who "my" claims and PRs belong to.
  me?: string;
  mainCheckout?: string;
  base: { branch: string; sha: string; date: string; mode: BaseMode; reason?: string };
  lanes: { focus: FocusRow[]; inFlight: FlightRow[]; ready: ReadyRow[]; blocked: BlockedRow[]; needsYou: AttentionRow[] };
  footer: {
    merged: number;
    unknownBase: number;
    unreadable: number;
    paused: number;
    backlog: number;
    duplicates: string[];
    prs?: string;
    sessions?: string;
    // This repo's sessions on no focus row; only when the FOCUS lane has rows.
    otherSessions?: FocusSession[];
  };
}
