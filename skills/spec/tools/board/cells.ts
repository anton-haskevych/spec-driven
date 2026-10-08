import { basename } from "node:path";
import type { PrCell, SessionCell } from "./model";

export const EMPTY = "—";
const UNKNOWN = "?";
const COLUMN_GAP = "  ";
const MINUTE_MS = 60_000;
const DURATION = new Intl.DurationFormat("en", { style: "narrow" });

export function alignColumns(rows: ReadonlyArray<readonly string[]>): string[] {
  const widths: number[] = [];
  for (const row of rows) row.forEach((cell, index) => (widths[index] = Math.max(widths[index] ?? 0, Bun.stringWidth(cell))));
  return rows.map((row) =>
    row
      .map((cell, index) => (index === row.length - 1 ? cell : cell + " ".repeat((widths[index] ?? 0) - Bun.stringWidth(cell))))
      .join(COLUMN_GAP)
      .trimEnd(),
  );
}

export function lane(title: string, lines: readonly string[]): string {
  return [title, ...(lines.length > 0 ? lines : ["none"]).map((line) => `  ${line}`)].join("\n");
}

export function rowName(row: { spec: string; phase?: string; prGroup?: string }): string {
  const name = row.phase === undefined ? row.spec : `${row.spec} · ${row.phase}`;
  return row.prGroup ? `${name} (PR ${row.prGroup})` : name;
}

export function monthDay(isoDay: string): string {
  return isoDay.slice(5, 10);
}

export function clock(date: Date): string {
  return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

export function stamp(date: Date): string {
  return `${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())} ${clock(date)}`;
}

export function ago(then: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - then.getTime()) / MINUTE_MS));
  if (minutes >= 24 * 60) return DURATION.format({ days: Math.floor(minutes / (24 * 60)) });
  if (minutes >= 60) return DURATION.format({ hours: Math.floor(minutes / 60) });
  return minutes > 0 ? DURATION.format({ minutes }) : "<1m";
}

export interface Checkouts {
  here: string;
  mainCheckout?: string;
}

const MAIN_CHECKOUT = "main checkout";
const HERE = " ◀ here";

export function workspaceName(workspace: string, checkouts: Checkouts): string {
  return workspace === checkouts.mainCheckout ? MAIN_CHECKOUT : basename(workspace);
}

export function workspaceCell(workspace: string | undefined, checkouts: Checkouts): string {
  if (!workspace) return EMPTY;
  return workspaceName(workspace, checkouts) + (workspace === checkouts.here ? HERE : "");
}

export function sessionCell(session: SessionCell | undefined, now: Date): string {
  if (!session) return EMPTY;
  return "since" in session ? `${session.status} ${ago(new Date(session.since), now)}` : session.status;
}

export function prCell(pr: PrCell | "unknown" | undefined): string {
  if (!pr) return EMPTY;
  if (pr === "unknown") return UNKNOWN;
  const number = `#${pr.number}${pr.draft ? " draft" : ""}`;
  if (!pr.listed) return `${number} ${UNKNOWN}`;
  if (pr.state) return `${number} ${pr.state}`;
  if (pr.failing) return `${number} ✗ ${pr.failing}`;
  if (pr.pending) return `${number} … ${pr.pending}`;
  return pr.passing ? `${number} ✓` : number;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}
