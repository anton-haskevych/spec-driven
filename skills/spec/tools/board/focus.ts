import { isoDay } from "../core/schedule";
import { isFinished, type SpecNode } from "../graph/nodes";
import { parseLaunchTitle } from "../launch/title";
import { specSummary } from "../portfolio/rows";
import { sessionLabel } from "../sessions/label";
import type { LiveSession } from "../sessions/live";
import { attributeSessions } from "./attribution";
import { deployWaits } from "./deploy-waits";
import type { BoardInputs } from "./inputs";
import { linkedPrs, toPrCell } from "./joins";
import type { PrRow } from "../pr/rollup";
import type { BlockedRow, FlightRow, FocusNow, FocusRow, FocusSession, ReadyRow } from "./model";
import { focusWork, type PersonClaim } from "./people";
import { splitKey } from "./phase-keys";

const DROPPED = new Set(["abandoned", "good-enough"]);

export interface FocusLane {
  rows: FocusRow[];
  otherSessions: FocusSession[];
}

interface FocusedSpec {
  node: SpecNode;
  rank: number;
}

interface BuiltLanes {
  inFlight: readonly FlightRow[];
  ready: readonly ReadyRow[];
  blocked: readonly BlockedRow[];
}

// Base specs with `focus:`, ranked; finished ones stay only while a linked PR is open (merging).
export function focusOrder(inputs: BoardInputs): FocusedSpec[] {
  return [...inputs.nodes.values()]
    .flatMap((node) => (node.meta.focus === undefined || !isShown(node, inputs) ? [] : [{ node, rank: node.meta.focus }]))
    .toSorted((a, b) => a.rank - b.rank || a.node.spec.name.localeCompare(b.node.spec.name));
}

export function withFocusPositions(rows: readonly ReadyRow[], order: readonly FocusedSpec[]): ReadyRow[] {
  const positions = new Map(order.map(({ node }, index) => [node.spec.name, index + 1]));
  return rows.map((row) => {
    const focus = positions.get(row.spec);
    return focus === undefined ? row : { ...row, focus };
  });
}

export function focusLane(lanes: BuiltLanes, order: readonly FocusedSpec[], inputs: BoardInputs, now: Date, me?: string): FocusLane {
  if (order.length === 0) return { rows: [], otherSessions: [] };
  const today = isoDay(now);
  const live = inputs.sessions !== "local" && inputs.sessions.ok ? inputs.sessions.value : [];
  const { bySpec, unattributed } = attributeSessions(live, inputs, new Set(order.map(({ node }) => node.spec.name)));
  const rows = order.map(({ node, rank }): FocusRow => {
    const name = node.spec.name;
    const { progress, due, overdue } = specSummary(node, today);
    const stage = inputs.stages.get(name);
    return {
      spec: name,
      rank,
      ...(node.meta.owner ? { owner: node.meta.owner } : {}),
      ...(stage ? { stage } : { progress }),
      ...(due ? { due } : {}),
      overdue,
      now: focusNow(node, lanes, inputs),
      sessions: (bySpec.get(name) ?? []).map((session) => focusSession(session, name)),
      ...focusWork(remoteClaims(name, inputs), openLinkedPrs(name, inputs).map((pr) => ({ author: pr.author, cell: toPrCell(pr) })), me),
    };
  });
  return { rows, otherSessions: unattributed.map((session) => focusSession(session)) };
}

function isShown(node: SpecNode, inputs: BoardInputs): boolean {
  if (!isFinished(node)) return true;
  if (DROPPED.has(node.status ?? "")) return false;
  return openLinkedPr(node.spec.name, inputs) !== undefined;
}

function focusNow(node: SpecNode, lanes: BuiltLanes, inputs: BoardInputs): FocusNow {
  const name = node.spec.name;
  const ofSpec = <Row extends { spec: string }>(rows: readonly Row[]) => rows.filter((row) => row.spec === name);
  return flightNow(ofSpec(lanes.inFlight)) ?? readyNow(ofSpec(lanes.ready)) ?? deployNow(name, inputs) ?? blockedNow(ofSpec(lanes.blocked)) ?? pausedNow(node) ?? mergingNow(node, inputs) ?? { kind: "none" };
}

function flightNow(rows: readonly FlightRow[]): FocusNow | undefined {
  if (rows.length === 0) return undefined;
  return { kind: "flight", phases: rows.map((row) => row.phase ?? ""), next: rows.map((row) => row.next) };
}

function readyNow(rows: readonly ReadyRow[]): FocusNow | undefined {
  const [first] = rows;
  if (!first) return undefined;
  return { kind: "ready", phases: rows.flatMap((row) => (row.phase === undefined ? [] : [row.phase])), step: first.next };
}

function deployNow(spec: string, inputs: BoardInputs): FocusNow | undefined {
  const state = inputs.states.get(spec);
  const targets = state ? deployWaits([state], inputs.nodes).map(({ target }) => splitKey(target)) : [];
  const phases = [...new Set(targets.map((target) => (target.spec === spec && target.phase ? target.phase : `${target.spec}#${target.phase ?? ""}`)))];
  return phases.length > 0 ? { kind: "deploy", phases } : undefined;
}

function blockedNow(rows: readonly BlockedRow[]): FocusNow | undefined {
  const reason = rows[0]?.reasons[0];
  return reason === undefined ? undefined : { kind: "blocked", reason };
}

function pausedNow(node: SpecNode): FocusNow | undefined {
  return node.status === "paused" ? { kind: "paused" } : undefined;
}

function mergingNow(node: SpecNode, inputs: BoardInputs): FocusNow | undefined {
  const pr = isFinished(node) ? openLinkedPr(node.spec.name, inputs) : undefined;
  return pr === undefined ? undefined : { kind: "merging", pr };
}

function openLinkedPr(spec: string, inputs: BoardInputs): number | undefined {
  return openLinkedPrs(spec, inputs)[0]?.number;
}

function openLinkedPrs(spec: string, { prs, prLinks }: BoardInputs): PrRow[] {
  if (prs === "local" || !prs.ok) return [];
  return linkedPrs(prs.value, prLinks.get(spec) ?? []).filter((pr) => pr.state === "OPEN");
}

function remoteClaims(spec: string, { claims }: BoardInputs): PersonClaim[] {
  return claims.flatMap(({ claim, status, holder }) => (status === "remote" && holder && claim.spec === spec ? [{ user: holder.user, phase: claim.phase, since: claim.claimedAt }] : []));
}

function focusSession(session: LiveSession, spec?: string): FocusSession {
  const title = session.name === undefined ? undefined : parseLaunchTitle(session.name);
  const launched = title && title.spec === spec ? { sub: title.sub, ...(title.phase ? { phase: title.phase } : {}) } : {};
  return { label: sessionLabel(session.name, session.sessionId), ...launched, status: session.status, since: session.updatedAt.toISOString() };
}
