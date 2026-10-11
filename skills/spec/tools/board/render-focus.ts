import { alignColumns } from "../core/columns";
import { ago, EMPTY, lane, monthDay, prCell } from "./cells";
import type { Board, FlightNext, FocusClaim, FocusNow, FocusRow, FocusSession, FocusWork } from "./model";
import { ME, personKey } from "./people";

const READY_SHOWN = 3;
const OTHER_SESSIONS_SHOWN = 5;
const CLAIMS_SHOWN = 2;
const STAGE: Record<NonNullable<FocusRow["stage"]>, string> = { prep: "prep", create: "draft" };
const FLIGHT_SHORT: Partial<Record<FlightNext, string>> = { "ticked on branch, not merged": "on branch" };

export function focusSection(board: Board, now: Date, who?: string): string {
  const me = board.me ? personKey(board.me) : ME;
  const rows = board.lanes.focus;
  const lines = alignColumns(rows.map((row) => [String(row.position), row.overdue ? `${row.spec} ⚠` : row.spec, progressCell(row), nowCell(row), whoCell(row, me, now)]));
  const others = board.footer.otherSessions ?? [];
  return lane(who ? `FOCUS · ${who}` : "FOCUS", [...withBandHeaders(rows, lines), ...(others.length > 0 ? [`other sessions: ${otherSessionsCell(others, now)}`] : [])]);
}

// Headers go in after alignment, so the bands read as one table.
function withBandHeaders(rows: readonly FocusRow[], lines: readonly string[]): string[] {
  return lines.flatMap((line, index) => {
    const band = rows[index]?.band;
    return band && band !== rows[index - 1]?.band ? [band.toUpperCase(), line] : [line];
  });
}

function progressCell(row: FocusRow): string {
  if (row.stage) return STAGE[row.stage];
  return row.progress ? `${row.progress.done}/${row.progress.total}` : EMPTY;
}

function nowCell(row: FocusRow): string {
  const text = nowText(row.now);
  return row.due && !row.overdue ? `${text} · due ${monthDay(row.due)}` : text;
}

function nowText(now: FocusNow): string {
  switch (now.kind) {
    case "flight":
      return flightText(now.phases, now.next);
    case "ready":
      return now.step === "execute" ? `ready ${capped(now.phases, READY_SHOWN)}` : `ready: /spec ${now.step}`;
    case "deploy":
      return `needs deploy of ${now.phases.join(", ")}`;
    case "blocked":
      return `blocked: ${now.reason}`;
    case "paused":
      return "paused";
    case "merging":
      return `merging #${now.pr}`;
    case "none":
      return EMPTY;
  }
}

function flightText(phases: readonly string[], next: readonly FlightNext[]): string {
  const executing = phases.filter((_, index) => next[index] === "executing");
  const others = phases.flatMap((phase, index) => {
    const step = next[index];
    return step === undefined || step === "executing" ? [] : [`${phase} ${FLIGHT_SHORT[step] ?? step}`];
  });
  return [...(executing.length > 0 ? [`executing ${executing.join(", ")}`] : []), ...others].join(" · ");
}

function whoCell(row: FocusRow, me: string, now: Date): string {
  const people = withMySessions(row, me).map(({ work, sessions }) => `${work.person}: ${workText(work, sessions, now)}`);
  const cells = [...people, ...(row.unattributedPrs.length > 0 ? [row.unattributedPrs.map(prCell).join(" ")] : [])];
  if (cells.length > 0) return cells.join("; ");
  return row.owner ? `${EMPTY} (${row.owner})` : EMPTY;
}

function withMySessions(row: FocusRow, me: string): { work: FocusWork; sessions: readonly FocusSession[] }[] {
  const mine = row.work.find((work) => work.mine) ?? (row.sessions.length > 0 ? { person: me, mine: true, claims: [], prs: [] } : undefined);
  const others = row.work.filter((work) => !work.mine).map((work) => ({ work, sessions: [] }));
  return mine ? [{ work: mine, sessions: row.sessions }, ...others] : others;
}

function workText(work: FocusWork, sessions: readonly FocusSession[], now: Date): string {
  const parts = [sessions.map((session) => sessionText(session, now)).join(", "), claimsText(work.claims, now), work.prs.map(prCell).join(" ")];
  return parts.filter(Boolean).join(" · ");
}

function claimsText(claims: readonly FocusClaim[], now: Date): string {
  if (claims.length > CLAIMS_SHOWN) {
    const [oldest = ""] = claims.map((claim) => claim.since).toSorted();
    return `${claims.length} claims ${ago(new Date(oldest), now)}`;
  }
  return claims.map((claim) => `claim ${claim.phase} ${ago(new Date(claim.since), now)}`).join(", ");
}

function sessionText(session: FocusSession, now: Date): string {
  const who = session.sub ? [session.sub, ...(session.phase ? [session.phase] : [])].join(" ") : session.label;
  return `${who} ${session.status} ${ago(new Date(session.since), now)}`;
}

function otherSessionsCell(sessions: readonly FocusSession[], now: Date): string {
  const shown = sessions.slice(0, OTHER_SESSIONS_SHOWN).map((session) => `${session.label} ${session.status} ${ago(new Date(session.since), now)}`);
  return [...shown, ...(sessions.length > OTHER_SESSIONS_SHOWN ? [`+${sessions.length - OTHER_SESSIONS_SHOWN}`] : [])].join(", ");
}

function capped(items: readonly string[], shown: number): string {
  const head = items.slice(0, shown).join(", ");
  return items.length > shown ? `${head} +${items.length - shown}` : head;
}
