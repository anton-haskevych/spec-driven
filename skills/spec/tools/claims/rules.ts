import type { PhaseActivity } from "../board/activity";
import { rowKey } from "../board/phase-keys";
import type { Result } from "../core/result";
import type { SpecState } from "../core/spec-state";
import { sessionLabel } from "../sessions/label";
import type { LiveSession } from "../sessions/live";
import { prClaimGroup } from "./pr-claim";
import { remoteHolderName, type Holder } from "./remote-payload";
import type { Claim } from "./store";

// "remote": another machine's claim, read from origin. claimStatus never returns it: liveness can't be
// checked across machines.
export type ClaimStatus = "unknown" | "live" | "done" | "gone" | "closed" | "remote";

export interface HeldClaim {
  claim: Claim;
  status: ClaimStatus;
  holder?: Holder;
}

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
  const group = prClaimGroup(phase);
  if (group !== undefined) return states.some((state) => state.phases.some((candidate) => candidate.edges.pr === group)) ? undefined : `PR group ${group} is not in ${spec}`;
  if (!states.some((state) => state.phases.some((candidate) => candidate.id === phase))) return `phase ${phase} is not in ${spec}`;
  const activity = view.activity.get(rowKey({ spec, phase }));
  const elsewhere = [...(activity?.wipIn ?? []), ...(activity?.tickedIn ?? [])].find((path) => path !== view.currentPath);
  return elsewhere ? `phase ${phase} is in progress in ${elsewhere}` : undefined;
}

export function heldName(held: HeldClaim): string {
  return held.holder ? remoteHolderName({ claim: held.claim, holder: held.holder }) : holderName(held.claim);
}

export function holderName(claim: Claim): string {
  return sessionLabel(claim.sessionName, claim.sessionId);
}
