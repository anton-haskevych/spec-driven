import { numberField, parseFrontmatter, stringField } from "../core/frontmatter";
import { setFrontmatterLine } from "../core/frontmatter-patch";

// `<git-common-dir>/spec-board/crew/run.md`, written only by the overseer (crew-brief.md → Run file).
// Writers replace one section and leave the rest byte-identical, so nothing is hand-edited twice.

export const LOG_LINES = 30;
export const DEFAULT_CAPS: Caps = { workers: 3, babysitters: 2 };

export interface Caps {
  workers: number;
  babysitters: number;
}

export interface LaunchedEntry {
  id: string;
  title: string;
  at: string;
}

export interface OpenQuestion {
  id: string;
  spec: string;
  phase: string;
}

export interface RunFile {
  overseer?: string;
  state?: string;
  caps: Caps;
  launched: LaunchedEntry[];
  unanswered: OpenQuestion[];
}

export interface NewRun {
  overseer: string;
  started: string;
  caps: Caps;
  cli?: string;
}

const LAUNCHED = /^- (\S+) · (.+) · (\S+)$/;
const QUESTION = /^- \[(\w+)\] (\S+) (\S+) · /;
const ANSWER = /^\s+- answer /;

export function parseRunFile(text: string): RunFile {
  const parsed = parseFrontmatter(text);
  const data = parsed.kind === "ok" ? parsed.data : {};
  const overseer = stringField(data, "overseer");
  const state = stringField(data, "state");
  return {
    ...(overseer ? { overseer } : {}),
    ...(state ? { state } : {}),
    caps: { workers: numberField(data, "workers") ?? DEFAULT_CAPS.workers, babysitters: numberField(data, "babysitters") ?? DEFAULT_CAPS.babysitters },
    launched: sectionLines(text, "Launched").flatMap(launchedEntry),
    unanswered: unansweredQuestions(sectionLines(text, "Questions")),
  };
}

export function newRunFile({ overseer, started, caps, cli }: NewRun): string {
  const frontmatter = [`overseer: ${overseer}`, `started: ${started}`, "state: running", `workers: ${caps.workers}`, `babysitters: ${caps.babysitters}`, ...(cli ? [`cli: ${cli}`] : [])];
  return ["---", ...frontmatter, "---", "", "## Launched", "", "## Questions", "", "## Stood down", "", "## Log", ""].join("\n");
}

export function withOverseer(text: string, overseer: string): string {
  const patched = setFrontmatterLine(text, "overseer", overseer);
  return patched.kind === "ok" ? patched.text : text;
}

export function withLaunched(text: string, entries: readonly LaunchedEntry[]): string {
  return withSection(text, "Launched", entries.map((entry) => `- ${entry.id} · ${entry.title} · ${entry.at}`));
}

export function withLog(text: string, lines: readonly string[]): string {
  const log = [...sectionLines(text, "Log"), ...lines.map((line) => `- ${line}`)];
  return withSection(text, "Log", log.slice(-LOG_LINES));
}

function launchedEntry(line: string): LaunchedEntry[] {
  const match = LAUNCHED.exec(line);
  return match?.[1] && match[2] && match[3] ? [{ id: match[1], title: match[2], at: match[3] }] : [];
}

function unansweredQuestions(lines: readonly string[]): OpenQuestion[] {
  return lines.flatMap((line, index) => {
    const match = QUESTION.exec(line);
    if (!match?.[1] || !match[2] || !match[3]) return [];
    return childLines(lines, index).some((child) => ANSWER.test(child)) ? [] : [{ id: match[1], spec: match[2], phase: match[3] }];
  });
}

function childLines(lines: readonly string[], parent: number): readonly string[] {
  const following = lines.slice(parent + 1);
  const end = following.findIndex((line) => !/^\s/.test(line));
  return end === -1 ? following : following.slice(0, end);
}

function sectionLines(text: string, heading: string): string[] {
  const lines = text.split("\n");
  const range = sectionRange(lines, heading);
  return range ? lines.slice(range.start + 1, range.end).filter((line) => line.trim() !== "") : [];
}

function withSection(text: string, heading: string, body: readonly string[]): string {
  const lines = text.trimEnd().split("\n");
  const block = [`## ${heading}`, ...body, ""];
  const range = sectionRange(lines, heading);
  if (!range) return `${[...lines, "", ...block].join("\n")}\n`.replace(/\n+$/, "\n");
  return `${[...lines.slice(0, range.start), ...block, ...lines.slice(range.end)].join("\n").trimEnd()}\n`;
}

function sectionRange(lines: readonly string[], heading: string): { start: number; end: number } | undefined {
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return undefined;
  const next = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return { start, end: next === -1 ? lines.length : next };
}
