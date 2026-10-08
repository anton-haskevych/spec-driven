import { olderThanDays } from "../core/age";
import { isOverdue, isoDay } from "../core/schedule";
import type { SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { heldName, holderName, type HeldClaim } from "../claims/rules";
import { sessionLabel } from "../sessions/label";
import type { LiveSession } from "../sessions/live";
import type { BoardInputs } from "./inputs";
import type { AttentionRow, FlightRow } from "./model";
import { deployWaits } from "./deploy-waits";
import { rowKey, splitKey } from "./phase-keys";

export const REMOTE_CLAIM_STALE_DAYS = 3;
export const IDLE_CLAIM_DAYS = 2;

export function needsYou(active: readonly SpecNode[], inputs: BoardInputs, now: Date, inFlight: readonly FlightRow[]): AttentionRow[] {
  const today = isoDay(now);
  const states = active.flatMap((node) => inputs.states.get(node.spec.name) ?? []);
  return [...prAttention(inFlight), ...closedClaims(inputs, inFlight), ...oldRemoteClaims(inputs, inFlight, now), ...idleClaims(inputs, inFlight, now), ...active.flatMap((node) => overdue(node, inputs.states.get(node.spec.name), today)), ...awaitingDeploy(states, inputs.nodes), ...mergedTrees(inputs)];
}

export function prAttention(inFlight: readonly FlightRow[]): AttentionRow[] {
  const byPr = new Map<number, AttentionRow>();
  for (const row of inFlight) {
    const attention = prVerdictRow(row);
    if (attention && "pr" in attention && !byPr.has(attention.pr)) byPr.set(attention.pr, attention);
  }
  return [...byPr.values()];
}

function prVerdictRow(row: FlightRow): AttentionRow | undefined {
  if (!row.pr || row.pr === "unknown") return undefined;
  const where = { spec: row.spec, ...(row.phase ? { phase: row.phase } : {}), ...(row.prGroup ? { prGroup: row.prGroup } : {}) };
  if (row.next === "fix CI") return { kind: "fix", ...where, pr: row.pr.number, failing: row.pr.failing ?? 0 };
  return row.next === "merge" ? { kind: "merge", ...where, pr: row.pr.number } : undefined;
}

function closedClaims(inputs: BoardInputs, inFlight: readonly FlightRow[]): AttentionRow[] {
  const shown = new Set(inFlight.map(rowKey));
  return inputs.claims
    .filter((held) => held.status === "closed" && shown.has(rowKey(held.claim)))
    .map(({ claim }) => ({ kind: "claim", spec: claim.spec, phase: claim.phase, holder: holderName(claim) }));
}

// No liveness across machines, so age is the only signal that a remote holder went silent.
function oldRemoteClaims(inputs: BoardInputs, inFlight: readonly FlightRow[], now: Date): AttentionRow[] {
  const shown = new Set(inFlight.map(rowKey));
  return inputs.claims
    .filter((held) => held.status === "remote" && shown.has(rowKey(held.claim)) && olderThanDays(new Date(held.claim.claimedAt), now, REMOTE_CLAIM_STALE_DAYS))
    .map((held) => ({ kind: "remote-claim", spec: held.claim.spec, phase: held.claim.phase, holder: heldName(held), since: held.claim.claimedAt }));
}

// Idle, never stale: `isStale` means safe to take over, and a live session's claim is not that. A
// `shell` session's turn is over; a `startedAt` time says nothing about when it went quiet.
function idleClaims(inputs: BoardInputs, inFlight: readonly FlightRow[], now: Date): AttentionRow[] {
  if (inputs.sessions === "local" || !inputs.sessions.ok) return [];
  const idle = new Map(inputs.sessions.value.filter((session) => isIdleSince(session, now)).map((session) => [session.sessionId, session]));
  const shown = new Set(inFlight.map(rowKey));
  const held = inputs.claims.filter((claim) => claim.status === "live" && shown.has(rowKey(claim.claim)) && idle.has(claim.claim.sessionId));
  return groupBySessionAndSpec(held, idle);
}

function isIdleSince(session: LiveSession, now: Date): boolean {
  return session.status !== "busy" && session.updatedFrom === "updatedAt" && olderThanDays(session.updatedAt, now, IDLE_CLAIM_DAYS);
}

function groupBySessionAndSpec(held: readonly HeldClaim[], sessions: ReadonlyMap<string, LiveSession>): AttentionRow[] {
  const rows = new Map<string, Extract<AttentionRow, { kind: "idle-claim" }>>();
  for (const { claim } of held) {
    const session = sessions.get(claim.sessionId);
    if (!session) continue;
    const key = `${claim.sessionId}\0${claim.spec}`;
    const row = rows.get(key) ?? { kind: "idle-claim", spec: claim.spec, phases: [], session: sessionLabel(session.name, session.sessionId), since: session.updatedAt.toISOString() };
    rows.set(key, { ...row, phases: [...row.phases, claim.phase] });
  }
  return [...rows.values()];
}

function mergedTrees(inputs: BoardInputs): AttentionRow[] {
  return inputs.counts.merged > 0 ? [{ kind: "prune", trees: inputs.counts.merged }] : [];
}

function overdue(node: SpecNode, state: SpecState | undefined, today: string): AttentionRow[] {
  const spec = node.spec.name;
  const specRow: AttentionRow[] = node.meta.due && isOverdue(node.meta.due, today) ? [{ kind: "overdue", spec, due: node.meta.due }] : [];
  const phaseRows = (state?.phases ?? []).flatMap((phase): AttentionRow[] => {
    const due = phase.schedule.due;
    return !phase.done && due && isOverdue(due, today) ? [{ kind: "overdue", spec, phase: phase.id, due }] : [];
  });
  return [...specRow, ...phaseRows];
}

function awaitingDeploy(states: readonly SpecState[], nodes: ReadonlyMap<string, SpecNode>): AttentionRow[] {
  const waiting = new Map<string, string[]>();
  for (const { waiter, target } of deployWaits(states, nodes)) waiting.set(target, [...(waiting.get(target) ?? []), waiter]);
  return [...waiting].map(([key, by]) => {
    const { spec, phase = "" } = splitKey(key);
    return { kind: "deploy", spec, phase, waiting: by };
  });
}
