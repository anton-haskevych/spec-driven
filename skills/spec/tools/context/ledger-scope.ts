import { numericPart, samePhase } from "../core/phase-title";

export interface LedgerRow {
  file: string;
  tags: string[];
  line: string;
}

export interface ParsedIndex {
  rows: LedgerRow[];
  unparsed: number;
}

const ROW = /^\s*[-*]\s+`([^`]+\.md)`\s*[—–-]+\s*\[([^\]]*)\]/;
const ROW_START = /^\s*[-*]\s+`[^`]+\.md`/;
const PHASE_TOKEN = /^(?:phase\s+)?(\S+?)(\+)?$/;
const ALWAYS = new Set(["general", "load-bearing"]);
const SUPERSEDED = /superseded/i;

export function parseLedgerIndex(index: string): ParsedIndex {
  const rows: LedgerRow[] = [];
  let unparsed = 0;
  for (const line of index.split("\n")) {
    const match = ROW.exec(line);
    if (match?.[1] && match[2] !== undefined) {
      rows.push({ file: match[1], tags: match[2].split(",").map((tag) => tag.trim().toLowerCase()), line: line.trim() });
    } else if (ROW_START.test(line)) {
      unparsed += 1;
    }
  }
  return { rows, unparsed };
}

export function rowsForPhase(rows: readonly LedgerRow[], phaseId: string): LedgerRow[] {
  const matching = rows.filter((row) => !SUPERSEDED.test(row.line) && appliesTo(row.tags, phaseId));
  return matching.toSorted((a, b) => priority(a) - priority(b));
}

function priority(row: LedgerRow): number {
  if (row.tags.includes("load-bearing")) return 0;
  return row.tags.includes("general") ? 2 : 1;
}

function appliesTo(tags: readonly string[], phaseId: string): boolean {
  if (tags.some((tag) => ALWAYS.has(tag))) return true;
  let inPhaseList = false;
  for (const tag of tags) {
    if (tag.startsWith("phase")) inPhaseList = true;
    const match = inPhaseList ? PHASE_TOKEN.exec(tag) : null;
    if (match?.[1] && phaseMatches(match[1], match[2] === "+", phaseId)) return true;
  }
  return false;
}

function phaseMatches(value: string, openEnded: boolean, phaseId: string): boolean {
  if (!openEnded) return samePhase(value, phaseId);
  const from = numericPart(value);
  const current = numericPart(phaseId);
  return from !== undefined && current !== undefined && from <= current;
}
