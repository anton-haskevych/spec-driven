import { ago, alignColumns, clock, lane, monthDay, prCell, rowName, sessionCell, stamp, workspaceCell, workspaceName } from "./cells";
import type { AttentionRow, Board, FlightRow, ReadyRow } from "./model";
import { focusSection } from "./render-focus";

export type Lane = "focus" | "flight" | "ready" | "blocked" | "you";
export const LANES: readonly Lane[] = ["focus", "flight", "ready", "blocked", "you"];

export const READY_CAP = 8;
export const BLOCKED_CAP = 5;

const SHORT_SHA = 7;
const NEXT_COMMAND: Record<ReadyRow["next"], string> = { prep: "/spec prep", create: "/spec create", execute: "/spec execute" };
const STALE_BASE: Record<Exclude<Board["base"]["mode"], "fetched">, string> = {
  offline: "offline",
  busy: "fetch skipped (busy)",
  local: "local",
};

// `who`: the board's FOCUS rows were filtered to this person; the lane shows even when none are left.
export function renderBoard(board: Board, options: { lane?: Lane; who?: string } = {}): string {
  const now = new Date(board.generatedAt);
  const sections: Record<Lane, string> = {
    focus: focusSection(board, now, options.who),
    flight: lane("IN FLIGHT", alignColumns(flightCells(board, now))),
    ready: lane("READY   ★ = shares no files with anything in flight", capped(readyCells(board), READY_CAP, "ready", options.lane)),
    blocked: lane("BLOCKED", capped(blockedCells(board), BLOCKED_CAP, "blocked", options.lane)),
    you: lane("NEEDS YOU", alignColumns(board.lanes.needsYou.map((row) => attentionCells(row, now)))),
  };
  const shown = LANES.filter((name) => name !== "focus" || board.lanes.focus.length > 0 || options.who !== undefined);
  const body = options.lane ? [sections[options.lane]] : [...shown.map((name) => sections[name]), footer(board)];
  return [header(board, now), ...body].join("\n\n");
}

function header(board: Board, now: Date): string {
  const { branch, date, mode } = board.base;
  const sha = board.base.sha.slice(0, SHORT_SHA);
  const freshness =
    mode === "fetched" ? `origin/${branch} ${sha} · fetched ${clock(now)}` : `${STALE_BASE[mode]}, origin/${branch} as of ${sha} ${stamp(new Date(date))}`;
  const { focus, inFlight, ready, blocked, needsYou } = board.lanes;
  const counts = `${focus.length > 0 ? `${focus.length} focus · ` : ""}${inFlight.length} in flight · ${ready.length} ready · ${blocked.length} blocked · ${needsYou.length} ${needsYou.length === 1 ? "needs" : "need"} you`;
  return `spec board · ${board.repo} · ${freshness}\n${counts}`;
}

function capped(rows: ReadonlyArray<readonly string[]>, cap: number, name: Lane, asked: Lane | undefined): string[] {
  if (asked === name || rows.length <= cap) return alignColumns(rows);
  return [...alignColumns(rows.slice(0, cap)), `+${rows.length - cap} more → /spec list ${name}`];
}

function flightCells(board: Board, now: Date): string[][] {
  return board.lanes.inFlight.map((row) => [rowName(row), row.workspace ? workspaceCell(row.workspace, board) : (row.holder ?? workspaceCell(row.workspace, board)), sessionCell(row.session, now), prCell(row.pr), flightNext(row, board)]);
}

function flightNext(row: FlightRow, board: Board): string {
  if (!row.workspace || !row.alsoIn) return row.next;
  const names = [row.workspace, ...row.alsoIn].map((workspace) => workspaceName(workspace, board));
  return `ticked in ${names.length} worktrees: ${names.join(", ")}`;
}

function readyCells(board: Board): string[][] {
  return board.lanes.ready.map((row, index) => [
    `${index + 1} ${row.safe ? "★" : " "}`,
    rowName(row),
    NEXT_COMMAND[row.next],
    row.priority ?? "",
    row.overdue ? "⚠ overdue" : row.due ? monthDay(row.due) : "",
    readyNote(row, board),
  ]);
}

function readyNote(row: ReadyRow, board: Board): string {
  const note = placementNote(row, board);
  if (row.focus === undefined) return note;
  return note ? `focus ${row.focus} · ${note}` : `focus ${row.focus}`;
}

function placementNote(row: ReadyRow, board: Board): string {
  if (row.treeBusy) return row.treeBusy;
  if (row.readyIn) return `in ${workspaceName(row.readyIn.workspace, board)} (needs ${row.readyIn.needs.join(", ")}, ticked there)`;
  if (row.onlyOn) return `only on ${row.onlyOn}`;
  if (row.sharesWith) return `shares files with ${row.sharesWith.join(", ")}`;
  return row.unblocks > 0 ? `unblocks ${row.unblocks}` : "";
}

function blockedCells(board: Board): string[][] {
  return board.lanes.blocked.map((row) => [rowName(row), row.reasons.join("; ")]);
}

function attentionCells(row: AttentionRow, now: Date): string[] {
  if (row.kind === "merge") return [`#${row.pr} checks pass → merge`, rowName(row)];
  if (row.kind === "fix") return [`#${row.pr} ${row.failing} ${row.failing === 1 ? "check" : "checks"} failing → fix`, rowName(row)];
  if (row.kind === "overdue") return [`⚠ overdue (due ${monthDay(row.due)})`, rowName(row)];
  if (row.kind === "claim") return ["claim by a closed session", `${rowName(row)} → resume or release`];
  if (row.kind === "prune") return [`prune ${row.trees} merged ${row.trees === 1 ? "tree" : "trees"}`, "say yes to remove them (trees prune --apply)"];
  if (row.kind === "idle-claim") return [`claim idle ${ago(new Date(row.since), now)}`, `${row.spec} · ${row.phases.join(", ")} → switch to ${row.session} or take it over`];
  if (row.kind === "remote-claim") return [`remote claim ${ago(new Date(row.since), now)} old`, `${rowName(row)} → ask ${row.holder} or take it over`];
  return ["not deployed → deploy", rowName(row), `needed by ${row.waiting.join(", ")}`];
}

function footer(board: Board): string {
  const { unknownBase, unreadable, paused, backlog, duplicates, prs, sessions } = board.footer;
  const counts = [
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
