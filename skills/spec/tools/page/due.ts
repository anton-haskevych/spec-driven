import { isoDay } from "../core/schedule";

export type DueKind = "late" | "soon" | "date" | "none";

// The Academy board's deadline words: overdue, today or tomorrow, a date, no deadline yet.
export interface DueWord {
  kind: DueKind;
  text: string;
  day?: string;
}

const DAY_MS = 24 * 60 * 60_000;
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function dueWord(due: string | undefined, now: Date): DueWord {
  if (due === undefined) return { kind: "none", text: "no deadline yet" };
  const today = isoDay(now);
  if (due < today) return { kind: "late", text: `overdue ${monthDay(due)}`, day: due };
  if (due === today) return { kind: "soon", text: "today", day: due };
  if (due === isoDay(new Date(now.getTime() + DAY_MS))) return { kind: "soon", text: "tomorrow", day: due };
  return { kind: "date", text: monthDay(due), day: due };
}

export function monthDay(day: string): string {
  return MONTH_DAY.format(new Date(`${day}T12:00:00Z`));
}
