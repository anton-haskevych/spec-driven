import { stringField, type FrontmatterData } from "./frontmatter";

export const PRIORITIES = ["p1", "p2", "p3"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Schedule {
  priority?: Priority;
  due?: string;
  problems: string[];
}

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;
const UNPRIORITIZED_RANK = PRIORITIES.length + 1;
const NO_DUE = "9999-99-99";

export function readSchedule(data: FrontmatterData): Schedule {
  const schedule: Schedule = { problems: [] };
  const rawPriority = stringField(data, "priority");
  if (rawPriority !== undefined) {
    const priority = PRIORITIES.find((value) => value === rawPriority.toLowerCase());
    if (priority) schedule.priority = priority;
    else schedule.problems.push(`priority "${rawPriority}" is not one of ${PRIORITIES.join(", ")}`);
  }
  const rawDue = stringField(data, "due");
  if (rawDue !== undefined) {
    if (isCalendarDay(rawDue)) schedule.due = rawDue;
    else schedule.problems.push(`due "${rawDue}" is not a date; use YYYY-MM-DD`);
  }
  return schedule;
}

export function isCalendarDay(value: string): boolean {
  if (!CALENDAR_DAY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function isOverdue(due: string | undefined, today: string): boolean {
  return due !== undefined && due < today;
}

export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Mirrors `spec-bump.sh --now`, which stays the no-Bun path; a test compares the two.
export function isoTimestamp(date: Date): string {
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(twoDigits).join(":");
  return `${isoDay(date)}T${time}${utcOffset(date)}`;
}

function utcOffset(date: Date): string {
  const minutesEast = -date.getTimezoneOffset();
  const sign = minutesEast < 0 ? "-" : "+";
  const absolute = Math.abs(minutesEast);
  return `${sign}${twoDigits(Math.floor(absolute / 60))}:${twoDigits(absolute % 60)}`;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function priorityRank(priority: Priority | undefined): number {
  return priority ? PRIORITIES.indexOf(priority) + 1 : UNPRIORITIZED_RANK;
}

export function compareSchedule(a: Pick<Schedule, "priority" | "due">, b: Pick<Schedule, "priority" | "due">): number {
  return priorityRank(a.priority) - priorityRank(b.priority) || (a.due ?? NO_DUE).localeCompare(b.due ?? NO_DUE);
}
