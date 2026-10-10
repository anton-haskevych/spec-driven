import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { readTextIfExists } from "../../core/files";
import { isRecord, stringField } from "../../core/frontmatter";
import { parseJson } from "../gh-records";

const EVENT_KINDS = ["babysit-start", "opened", "ready", "waiting", "green", "red", "cancelled", "rerun", "none", "timeout", "note", "pushed", "merged", "closed", "stopped"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

// `spec` and `group` are written on babysit-start only: the timeline header names them.
export interface BabysitEvent {
  at: string;
  event: EventKind;
  sha?: string;
  detail?: string;
  spec?: string;
  group?: string;
}

export interface BabysitLog {
  events: BabysitEvent[];
  skipped: number;
}

const OPTIONAL_FIELDS = ["sha", "detail", "spec", "group"] as const;

export function logFile(dir: string, pr: number): string {
  return join(dir, `pr-${pr}.jsonl`);
}

// One write per line: POSIX keeps small appends whole, so concurrent writers never interleave a line.
export function appendEvent(dir: string, pr: number, event: BabysitEvent): void {
  mkdirSync(dir, { recursive: true });
  appendFileSync(logFile(dir, pr), `${JSON.stringify(event)}\n`);
}

export function readEvents(dir: string, pr: number): BabysitLog {
  return parseEvents(readTextIfExists(logFile(dir, pr)) ?? "");
}

export function parseEvents(text: string): BabysitLog {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  const events = lines.flatMap((line) => {
    const event = eventFromRecord(parseJson(line));
    return event ? [event] : [];
  });
  return { events, skipped: lines.length - events.length };
}

function eventFromRecord(data: unknown): BabysitEvent | undefined {
  if (!isRecord(data)) return undefined;
  const at = stringField(data, "at");
  const kind = stringField(data, "event");
  if (!at || Number.isNaN(Date.parse(at)) || !isEventKind(kind)) return undefined;
  const event: BabysitEvent = { at, event: kind };
  for (const field of OPTIONAL_FIELDS) {
    const value = stringField(data, field);
    if (value) event[field] = value;
  }
  return event;
}

function isEventKind(value: string | undefined): value is EventKind {
  return EVENT_KINDS.some((kind) => kind === value);
}

export function renderTimeline(pr: number, log: BabysitLog, timeZone: string): string {
  const skippedNote = log.skipped > 0 ? `skipped ${log.skipped} malformed ${log.skipped === 1 ? "line" : "lines"}` : undefined;
  if (log.events.length === 0) return [`PR #${pr}: no babysit log on this machine`, skippedNote].filter(Boolean).join(" · ");
  const clock = localClock(timeZone);
  const spansDays = new Set(log.events.map((event) => clock.day(event.at))).size > 1;
  const lines = [header(pr, log.events, clock)];
  let day: string | undefined;
  for (const event of log.events) {
    if (spansDays && clock.day(event.at) !== day) lines.push((day = clock.day(event.at)));
    lines.push([`${clock.time(event.at)} ${event.event}`, event.detail].filter(Boolean).join(" · "));
  }
  if (skippedNote) lines.push(skippedNote);
  return lines.join("\n");
}

function header(pr: number, events: readonly BabysitEvent[], clock: LocalClock): string {
  const startIndex = events.findLastIndex((event) => event.event === "babysit-start");
  const start = events[startIndex];
  if (!start) return `PR #${pr} babysit log · no babysit started`;
  const since = events.slice(startIndex + 1);
  const count = (kind: EventKind) => since.filter((event) => event.event === kind).length;
  const reruns = count("rerun");
  const pushes = count("pushed");
  return [
    `PR #${pr} babysit`,
    start.group,
    start.spec,
    `started ${clock.time(start.at)}`,
    `${reruns} ${reruns === 1 ? "rerun" : "reruns"}`,
    `${pushes} ${pushes === 1 ? "fix push" : "fix pushes"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

interface LocalClock {
  time(at: string): string;
  day(at: string): string;
}

function localClock(timeZone: string): LocalClock {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return { time: (at) => time.format(new Date(at)), day: (at) => day.format(new Date(at)) };
}
