import { sep } from "node:path";
import type { PrRow } from "../pr/rollup";
import type { LiveSession } from "../sessions/live";
import { claimsOnBoard } from "./flight";
import type { BoardInputs } from "./inputs";
import { rowKey } from "./phase-keys";
import type { FlightNext, FlightRow, PrCell, SessionCell } from "./model";

export function joinFlightRows(rows: readonly FlightRow[], inputs: BoardInputs): FlightRow[] {
  return attachPrs(attachSessions(rows, inputs), inputs);
}

export function attachSessions(rows: readonly FlightRow[], inputs: BoardInputs): FlightRow[] {
  const { sessions } = inputs;
  if (sessions === "local") return [...rows];
  if (!sessions.ok) return rows.map((row) => ({ ...row, session: { status: "unknown" } }));
  const claims = claimsOnBoard(inputs);
  const byWorkspace = sessionsByWorkspace(sessions.value, inputs.workspaces.map((workspace) => workspace.path));
  return rows.map((row) => {
    const held = claims.get(rowKey(row));
    if (held?.status === "closed") return { ...row, session: { status: "closed" } };
    const claimant = held && sessions.value.find((session) => session.sessionId === held.claim.sessionId);
    const latest = claimant ?? (byWorkspace.get(row.workspace ?? "") ?? []).toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    return latest ? { ...row, session: sessionCell(latest) } : { ...row };
  });
}

export function attachPrs(rows: readonly FlightRow[], inputs: BoardInputs): FlightRow[] {
  const { prs } = inputs;
  if (prs === "local") return [...rows];
  if (!prs.ok) return rows.map((row) => ({ ...row, pr: "unknown" }));
  return rows.map((row) => {
    const branch = inputs.workspaces.find((workspace) => workspace.path === row.workspace)?.branch;
    const cell = byBranch(prs.value, branch) ?? byLinks(prs.value, inputs.prLinks.get(row.spec) ?? []);
    return cell ? { ...row, pr: cell, next: nextFromChecks(cell) ?? row.next } : { ...row };
  });
}

function sessionsByWorkspace(sessions: readonly LiveSession[], paths: readonly string[]): Map<string, LiveSession[]> {
  const deepestFirst = paths.toSorted((a, b) => b.length - a.length);
  const owned = new Map<string, LiveSession[]>();
  for (const session of sessions) {
    const owner = deepestFirst.find((path) => session.cwd === path || session.cwd.startsWith(path + sep));
    if (owner) owned.set(owner, [...(owned.get(owner) ?? []), session]);
  }
  return owned;
}

function sessionCell(session: LiveSession): SessionCell {
  return { status: session.status, since: session.updatedAt.toISOString() };
}

function byBranch(prs: readonly PrRow[], branch: string | undefined): PrCell | undefined {
  if (!branch) return undefined;
  const newestFirst = prs.filter((pr) => pr.branch === branch).toSorted((a, b) => b.number - a.number);
  const chosen = newestFirst.find((pr) => pr.state === "OPEN") ?? newestFirst[0];
  return chosen && prCell(chosen);
}

function byLinks(prs: readonly PrRow[], links: readonly number[]): PrCell | undefined {
  const newestFirst = links.toReversed();
  const listed = newestFirst.flatMap((number) => prs.filter((pr) => pr.number === number));
  const chosen = listed.find((pr) => pr.state === "OPEN") ?? listed[0];
  if (chosen) return prCell(chosen);
  return newestFirst[0] === undefined ? undefined : { number: newestFirst[0], listed: false };
}

function prCell(pr: PrRow): PrCell {
  const base: PrCell = { number: pr.number, listed: true, ...(pr.draft ? { draft: true } : {}) };
  if (pr.state !== "OPEN") return { ...base, state: pr.state === "MERGED" ? "merged" : "closed" };
  if (!pr.checks) return base;
  const { pass, fail, cancel, pending } = pr.checks.counts;
  return { ...base, failing: fail + cancel, pending, passing: pass };
}

function nextFromChecks(cell: PrCell): FlightNext | undefined {
  if (cell.state || cell.failing === undefined) return undefined;
  if (cell.failing > 0) return "fix CI";
  return !cell.draft && (cell.passing ?? 0) > 0 && cell.pending === 0 ? "merge" : undefined;
}
