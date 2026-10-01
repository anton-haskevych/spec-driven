import { parseIndexRows } from "../core/ledger-index";
import { comparePhaseIds, samePhase } from "../core/phase-title";

export interface LedgerRow {
  file: string;
  tags: string[];
  line: string;
}

export interface ParsedIndex {
  rows: LedgerRow[];
  unparsed: number;
}

const TAGS = /^[—–-]+\s*\[([^\]]*)\]/;
const PHASE_TOKEN = /^(?:phase\s+)?(\S+?)(\+)?$/;
const ALWAYS = new Set(["general", "load-bearing"]);
const SUPERSEDED = /superseded/i;

export function parseLedgerIndex(index: string): ParsedIndex {
  const rows: LedgerRow[] = [];
  let unparsed = 0;
  for (const row of parseIndexRows(index)) {
    const tags = TAGS.exec(row.tail)?.[1];
    if (tags === undefined) unparsed += 1;
    else rows.push({ file: row.file, tags: tags.split(",").map((tag) => tag.trim().toLowerCase()), line: row.line });
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
  const order = comparePhaseIds(value, phaseId);
  return order !== undefined && order <= 0;
}
