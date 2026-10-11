import { compareDue, priorityRank } from "../core/schedule";
import { FOCUS_BANDS, type FocusBand } from "../core/spec-meta";
import { isFinished, type SpecNode } from "../graph/nodes";
import { parseLaunchTitle } from "../launch/title";
import { specSummary, type SpecSummary } from "../portfolio/rows";
import { sessionLabel } from "../sessions/label";
import type { LiveSession } from "../sessions/live";
import { attributeSessions } from "./attribution";
import { deployWaits } from "./deploy-waits";
import type { BoardInputs } from "./inputs";
import { linkedPrs, toPrCell } from "./joins";
import type { PrRow } from "../pr/checks/rollup";
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
  band: FocusBand;
  summary: SpecSummary;
}

interface BuiltLanes {
  inFlight: readonly FlightRow[];
  ready: readonly ReadyRow[];
  blocked: readonly BlockedRow[];
}

// Base specs with `focus:`, by band and then by their own data; finished ones stay only while a linked PR is open (merging).
export function focusOrder(inputs: BoardInputs, today: string): FocusedSpec[] {
  return [...inputs.nodes.values()]
    .flatMap((node) => {
      const band = node.meta.focus;
      return band === undefined || !isShown(node, inputs) ? [] : [{ node, band, summary: specSummary(node, today) }];
    })
    .toSorted(compareFocus);
}

function compareFocus(a: FocusedSpec, b: FocusedSpec): number {
  return (
    FOCUS_BANDS.indexOf(a.band) - FOCUS_BANDS.indexOf(b.band) ||
    Number(b.summary.overdue) - Number(a.summary.overdue) ||
    compareDue(a.summary.due, b.summary.due) ||
    priorityRank(a.summary.priority) - priorityRank(b.summary.priority) ||
    a.node.spec.name.localeCompare(b.node.spec.name)
  );
}

export function withFocusPositions(rows: readonly ReadyRow[], order: readonly FocusedSpec[]): ReadyRow[] {
  const places = new Map(order.map(({ node, band }, index) => [node.spec.name, { focus: index + 1, focusBand: band }]));
  return rows.map((row) => {
    const place = places.get(row.spec);
    return place === undefined ? row : { ...row, ...place };
  });
}

export function focusLane(lanes: BuiltLanes, order: readonly FocusedSpec[], inputs: BoardInputs, me?: string): FocusLane {
  if (order.length === 0) return { rows: [], otherSessions: [] };
  const live = inputs.sessions !== "local" && inputs.sessions.ok ? inputs.sessions.value : [];
  const { bySpec, unattributed } = attributeSessions(live, inputs, new Set(order.map(({ node }) => node.spec.name)));
  const rows = order.map(({ node, band, summary }, index): FocusRow => {
    const name = node.spec.name;
    const { progress, due, overdue } = summary;
    const stage = inputs.stages.get(name);
    return {
      spec: name,
      band,
      position: index + 1,
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
