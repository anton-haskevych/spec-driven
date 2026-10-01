import type { PhaseActivity } from "../board/activity";
import { rowKey } from "../board/phase-keys";
import type { Result } from "../core/result";
import type { SpecState } from "../core/spec-state";
import type { LiveSession } from "../sessions/live";
import type { Claim } from "./store";

export type ClaimStatus = "unknown" | "live" | "done" | "gone" | "closed";

export interface ClaimContext {
  sessions: Result<LiveSession[]>;
  // Every listed worktree, not only the board's live ones: a merged worktree still holds its claim.
  worktrees: ReadonlySet<string>;
  baseStates: ReadonlyMap<string, SpecState>;
}

export interface TakeView {
  baseState?: SpecState;
  ownState?: SpecState;
  activity: ReadonlyMap<string, PhaseActivity>;
  currentPath: string;
}

// Unknown comes first: if session files can't be read, no claim may look abandoned.
export function claimStatus(claim: Claim, context: ClaimContext): ClaimStatus {
  if (!context.sessions.ok) return "unknown";
  if (context.sessions.value.some((session) => session.sessionId === claim.sessionId)) return "live";
  if (context.baseStates.get(claim.spec)?.phases.some((phase) => phase.id === claim.phase && phase.done)) return "done";
  if (!context.worktrees.has(claim.workspace)) return "gone";
  return "closed";
}

export function isStale(status: ClaimStatus): boolean {
  return status === "done" || status === "gone" || status === "closed";
}

export function takeRefusal(spec: string, phase: string, view: TakeView): string | undefined {
  const states = [view.baseState, view.ownState].filter((state) => state !== undefined);
  if (states.length === 0) return `no spec named ${spec}`;
  if (!states.some((state) => state.phases.some((candidate) => candidate.id === phase))) return `phase ${phase} is not in ${spec}`;
  const activity = view.activity.get(rowKey({ spec, phase }));
  const elsewhere = [...(activity?.wipIn ?? []), ...(activity?.tickedIn ?? [])].find((path) => path !== view.currentPath);
  return elsewhere ? `phase ${phase} is in progress in ${elsewhere}` : undefined;
}
