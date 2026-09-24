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

function isCalendarDay(value: string): boolean {
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

export function priorityRank(priority: Priority | undefined): number {
  return priority ? PRIORITIES.indexOf(priority) + 1 : UNPRIORITIZED_RANK;
}
