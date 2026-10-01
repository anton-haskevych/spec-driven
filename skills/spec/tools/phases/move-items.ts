import { locateOpenItem } from "./locate";

export type TakenItems =
  | { kind: "ok"; remaining: string; moved: Map<number, string[]> }
  | { kind: "invalid"; reason: string };

interface Block {
  item: number;
  start: number;
  end: number;
}

const ASSIGNMENT = /^([b-z]):(\d+(?:,\d+)*)$/;
const FIRST_LABEL_CODE = "b".charCodeAt(0);

export function parseItemAssignments(values: readonly string[], titleCount: number): Map<number, number[]> | string {
  const assignments = new Map<number, number[]>();
  const seen = new Set<number>();
  for (const pair of values.flatMap((value) => value.split(/\s+/)).filter(Boolean)) {
    const match = ASSIGNMENT.exec(pair);
    if (!match?.[1] || !match[2]) return `--items "${pair}" is not <label>:<n>,<n>`;
    const titleIndex = match[1].charCodeAt(0) - FIRST_LABEL_CODE;
    if (titleIndex >= titleCount) return `--items label "${match[1]}" has no title; labels run b to ${labelFor(titleCount - 1)}`;
    for (const item of match[2].split(",").map(Number)) {
      if (seen.has(item)) return `--items moves open item ${item} twice`;
      seen.add(item);
      assignments.set(titleIndex, [...(assignments.get(titleIndex) ?? []), item]);
    }
  }
  return assignments;
}

export function takeOpenItems(entry: string, items: readonly number[]): TakenItems {
  const lines = entry.split("\n");
  const blocks: Block[] = [];
  for (const item of items) {
    const location = locateOpenItem(entry, `#${item}`);
    if (location.kind === "invalid") return { kind: "invalid", reason: `open item ${item}: ${location.reason}` };
    blocks.push({ item, start: location.line, end: blockEnd(lines, location.line) });
  }
  const nested = blocks.find((inner) => blocks.some((outer) => outer !== inner && inner.start > outer.start && inner.start < outer.end));
  if (nested) return { kind: "invalid", reason: `open item ${nested.item} is nested under another moved item; it moves with it` };

  const moved = new Map(blocks.map((block) => [block.item, dedent(lines.slice(block.start, block.end))]));
  const removed = new Set(blocks.flatMap((block) => range(block.start, block.end)));
  return { kind: "ok", remaining: lines.filter((_, index) => !removed.has(index)).join("\n"), moved };
}

function blockEnd(lines: readonly string[], start: number): number {
  const indent = indentOf(lines[start] ?? "");
  let end = start + 1;
  while (end < lines.length && (lines[end] ?? "").trim() && indentOf(lines[end] ?? "") > indent) end++;
  return end;
}

function dedent(block: readonly string[]): string[] {
  const indent = indentOf(block[0] ?? "");
  return block.map((line) => line.slice(indent));
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, offset) => start + offset);
}

function labelFor(titleIndex: number): string {
  return String.fromCharCode(FIRST_LABEL_CODE + titleIndex);
}
