import { ON_BOARD } from "../phases/template";

const FENCE = /^\s*(```|~~~)/;
const SECTION = /^##\s+/;
const DELIVERABLES = /^##\s+deliverables\b/i;
const CHECKBOX = /^\s*[-*+]\s+\[[ xX]\]\s/;
const CONTINUATION = /^\s+\S/;

export interface LineRange {
  start: number;
  end: number;
}

export function deliverablesSection(lines: readonly string[]): LineRange | undefined {
  let inFence = false;
  let start: number | undefined;
  for (const [index, line] of lines.entries()) {
    if (FENCE.test(line)) inFence = !inFence;
    if (inFence || !SECTION.test(line)) continue;
    if (start !== undefined) return { start, end: index };
    if (DELIVERABLES.test(line)) start = index;
  }
  return start === undefined ? undefined : { start, end: lines.length };
}

export function isCheckboxLine(line: string): boolean {
  return CHECKBOX.test(line);
}

export function linesOutsideFences(lines: readonly string[], from = 0, to = lines.length): number[] {
  let inFence = false;
  const kept: number[] = [];
  for (let index = from; index < to; index += 1) {
    const line = lines[index] ?? "";
    const fence = FENCE.test(line);
    if (fence) inFence = !inFence;
    if (!inFence && !fence) kept.push(index);
  }
  return kept;
}

// Tidy passes the on-board sentence and export the tasks, so each undoes the other.
export function replaceTaskLines(body: string, replacement: readonly string[]): string {
  const lines = body.split("\n");
  const section = deliverablesSection(lines);
  const removed = taskLineIndexes(lines, section);
  if (removed.length > 0) return spliceOver(lines, removed, replacement);
  if (section) return [...lines.slice(0, section.start + 1), "", ...replacement, ...lines.slice(section.start + 1)].join("\n");
  return `${body.replace(/\n+$/, "")}\n\n## Deliverables\n\n${replacement.join("\n")}\n`;
}

function taskLineIndexes(lines: readonly string[], section: LineRange | undefined): number[] {
  const candidates = section ? linesOutsideFences(lines, section.start + 1, section.end) : linesOutsideFences(lines);
  const removed: number[] = [];
  for (const index of candidates) {
    const line = lines[index] ?? "";
    const underBox = removed.at(-1) === index - 1 && CONTINUATION.test(line) && !CHECKBOX.test(line);
    if (CHECKBOX.test(line) || line === ON_BOARD || underBox) removed.push(index);
  }
  return removed;
}

function spliceOver(lines: readonly string[], removed: readonly number[], replacement: readonly string[]): string {
  const gone = new Set(removed);
  const first = removed[0] ?? 0;
  const kept = lines.flatMap((line, index) => (index === first ? [...replacement] : gone.has(index) ? [] : [line]));
  return kept.join("\n");
}
