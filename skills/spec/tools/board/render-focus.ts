import { ago, alignColumns, EMPTY, lane, monthDay } from "./cells";
import type { Board, FlightNext, FocusNow, FocusRow, FocusSession } from "./model";

const READY_SHOWN = 3;
const OTHER_SESSIONS_SHOWN = 5;
const STAGE: Record<NonNullable<FocusRow["stage"]>, string> = { prep: "prep", create: "draft" };
const FLIGHT_SHORT: Partial<Record<FlightNext, string>> = { "ticked on branch, not merged": "on branch" };

export function focusSection(board: Board, now: Date): string {
  const rows = board.lanes.focus.map((row, index) => [String(index + 1), row.overdue ? `${row.spec} ⚠` : row.spec, progressCell(row), nowCell(row), whoCell(row.sessions, now)]);
  const others = board.footer.otherSessions ?? [];
  return lane("FOCUS", [...alignColumns(rows), ...(others.length > 0 ? [`other sessions: ${otherSessionsCell(others, now)}`] : [])]);
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

function whoCell(sessions: readonly FocusSession[], now: Date): string {
  return sessions.length > 0 ? sessions.map((session) => sessionText(session, now)).join(", ") : EMPTY;
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
