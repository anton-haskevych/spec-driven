import { alignColumns, clock, monthDay, prCell, rowName, sessionCell, stamp, workspaceCell } from "./cells";
import type { AttentionRow, Board, ReadyRow } from "./model";

export type Lane = "flight" | "ready" | "blocked" | "you";
export const LANES: readonly Lane[] = ["flight", "ready", "blocked", "you"];

export const READY_CAP = 8;
export const BLOCKED_CAP = 5;

const NEXT_COMMAND: Record<ReadyRow["next"], string> = { prep: "/spec prep", create: "/spec create", execute: "/spec execute" };
const STALE_BASE: Record<Exclude<Board["base"]["mode"], "fetched">, string> = {
  offline: "offline",
  busy: "fetch skipped (busy)",
  local: "local",
};

export function renderBoard(board: Board, options: { lane?: Lane } = {}): string {
  const now = new Date(board.generatedAt);
  const sections: Record<Lane, string> = {
    flight: lane("IN FLIGHT", alignColumns(flightCells(board, now))),
    ready: lane("READY   ★ = shares no files with anything in flight", capped(readyCells(board), READY_CAP, "ready", options.lane)),
    blocked: lane("BLOCKED", capped(blockedCells(board), BLOCKED_CAP, "blocked", options.lane)),
    you: lane("NEEDS YOU", alignColumns(board.lanes.needsYou.map(attentionCells))),
  };
  const body = options.lane ? [sections[options.lane]] : [...LANES.map((name) => sections[name]), footer(board)];
  return [header(board, now), ...body].join("\n\n");
}

function header(board: Board, now: Date): string {
  const { branch, sha, date, mode } = board.base;
  const freshness =
    mode === "fetched" ? `origin/${branch} ${sha} · fetched ${clock(now)}` : `${STALE_BASE[mode]}, origin/${branch} as of ${sha} ${stamp(new Date(date))}`;
  const { inFlight, ready, blocked, needsYou } = board.lanes;
  const counts = `${inFlight.length} in flight · ${ready.length} ready · ${blocked.length} blocked · ${needsYou.length} ${needsYou.length === 1 ? "needs" : "need"} you`;
  return `spec board · ${board.repo} · ${freshness}\n${counts}`;
}

function lane(title: string, lines: readonly string[]): string {
  return [title, ...(lines.length > 0 ? lines : ["none"]).map((line) => `  ${line}`)].join("\n");
}

function capped(rows: ReadonlyArray<readonly string[]>, cap: number, name: Lane, asked: Lane | undefined): string[] {
  if (asked === name || rows.length <= cap) return alignColumns(rows);
  return [...alignColumns(rows.slice(0, cap)), `+${rows.length - cap} more → /spec list ${name}`];
}

function flightCells(board: Board, now: Date): string[][] {
  return board.lanes.inFlight.map((row) => [rowName(row), workspaceCell(row.workspace), sessionCell(row.session, now), prCell(row.pr), row.next]);
}

function readyCells(board: Board): string[][] {
  return board.lanes.ready.map((row, index) => [
    `${index + 1} ${row.safe ? "★" : " "}`,
    rowName(row),
    NEXT_COMMAND[row.next],
    row.priority ?? "",
    row.overdue ? "⚠ overdue" : row.due ? monthDay(row.due) : "",
    row.unblocks > 0 ? `unblocks ${row.unblocks}` : "",
  ]);
}

function blockedCells(board: Board): string[][] {
  return board.lanes.blocked.map((row) => [rowName(row), row.reasons.join("; ")]);
}

function attentionCells(row: AttentionRow): string[] {
  if (row.kind === "overdue") return [`⚠ overdue (due ${monthDay(row.due)})`, rowName(row)];
  return ["not deployed → deploy", rowName(row), `needed by ${row.waiting.join(", ")}`];
}

function footer(board: Board): string {
  const { merged, unknownBase, unreadable, paused, backlog, duplicates, prs, sessions } = board.footer;
  const counts = [
    [merged, "worktrees merged"],
    [unknownBase, "unknown base"],
    [unreadable, "unreadable"],
    [paused, "paused"],
  ] as const;
  const summary = [...counts.filter(([count]) => count > 0).map(([count, label]) => `${count} ${label}`), `${backlog} backlog ideas → /spec list table`];
  return [
    summary.join(" · "),
    ...(duplicates.length > 0 ? [`duplicate spec names: ${duplicates.join(", ")}`] : []),
    ...(prs ? [`PRs unavailable: ${prs}`] : []),
    ...(sessions ? [`sessions unavailable: ${sessions}`] : []),
  ].join("\n");
}
