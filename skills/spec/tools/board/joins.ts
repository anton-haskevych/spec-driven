import { prClaimGroup } from "../claims/pr-claim";
import type { ClaimStatus } from "../claims/rules";
import type { PrRow } from "../pr/checks/rollup";
import { sessionsByWorkspace } from "../sessions/by-workspace";
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
  const claims = claimsOnBoard(inputs);
  const byWorkspace = sessions.ok ? sessionsByWorkspace(sessions.value, inputs.workspaces.map((workspace) => workspace.path)) : new Map<string, LiveSession[]>();
  return rows.map((row) => {
    const held = claims.get(rowKey(row));
    if (held?.status === "remote") return { ...row, session: { status: "remote", since: held.claim.claimedAt } };
    if (!sessions.ok) return { ...row, session: { status: "unknown" } };
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
  const babysat = babysatGroups(inputs);
  return rows.map((row) => {
    const branch = inputs.workspaces.find((workspace) => workspace.path === row.workspace)?.branch;
    const cell = byBranch(prs.value, branch) ?? byLinks(prs.value, inputs.prLinks.get(row.spec) ?? []);
    if (!cell) return { ...row };
    if (!cell.state && row.prGroup && babysat.has(groupKey(row.spec, row.prGroup))) return { ...row, pr: { ...cell, babysitting: true }, next: "babysitting" };
    return { ...row, pr: cell, next: nextFromChecks(cell) ?? row.next };
  });
}

// Unknown counts: unreadable session files must not turn a babysat PR into a "merge" row.
const BABYSITTING: ReadonlySet<ClaimStatus> = new Set(["live", "remote", "unknown"]);

function babysatGroups(inputs: BoardInputs): Set<string> {
  return new Set(
    inputs.claims.flatMap(({ claim, status }) => {
      const group = prClaimGroup(claim.phase);
      return group !== undefined && BABYSITTING.has(status) ? [groupKey(claim.spec, group)] : [];
    }),
  );
}

function groupKey(spec: string, group: string): string {
  return `${spec}\0${group}`;
}

// pr-opening.md lists links oldest first.
export function linkedPrs(prs: readonly PrRow[], links: readonly number[]): PrRow[] {
  const listed = links.toReversed().flatMap((number) => prs.filter((pr) => pr.number === number));
  return [...listed.filter((pr) => pr.state === "OPEN"), ...listed.filter((pr) => pr.state !== "OPEN")];
}

export function toPrCell(pr: PrRow): PrCell {
  const base: PrCell = { number: pr.number, listed: true, ...(pr.draft ? { draft: true } : {}) };
  if (pr.state !== "OPEN") return { ...base, state: pr.state === "MERGED" ? "merged" : "closed" };
  if (!pr.checks) return base;
  const { pass, fail, cancel, queued, running } = pr.checks.counts;
  return { ...base, failing: fail + cancel, pending: queued + running, passing: pass, verdict: pr.checks.verdict.kind };
}

function sessionCell(session: LiveSession): SessionCell {
  return { status: session.status, since: session.updatedAt.toISOString() };
}

function byBranch(prs: readonly PrRow[], branch: string | undefined): PrCell | undefined {
  if (!branch) return undefined;
  const newestFirst = prs.filter((pr) => pr.branch === branch).toSorted((a, b) => b.number - a.number);
  const chosen = newestFirst.find((pr) => pr.state === "OPEN") ?? newestFirst[0];
  return chosen && toPrCell(chosen);
}

function byLinks(prs: readonly PrRow[], links: readonly number[]): PrCell | undefined {
  const [chosen] = linkedPrs(prs, links);
  if (chosen) return toPrCell(chosen);
  const newest = links.at(-1);
  return newest === undefined ? undefined : { number: newest, listed: false };
}

function nextFromChecks(cell: PrCell): FlightNext | undefined {
  if (cell.state || !cell.verdict) return undefined;
  if (cell.verdict === "red" || cell.verdict === "cancelled") return "fix CI";
  return cell.verdict === "green" && !cell.draft ? "merge" : undefined;
}
