import type { FrontmatterData } from "./frontmatter";

export interface PhaseEdges {
  declared: boolean;
  needs: string[];
  needsDeployed: string[];
  sameFilesAs: string[];
  pr?: string;
}

const EDGE_KEYS = ["needs", "needs-deployed", "same-files-as", "pr"];

export function parsePhaseEdges(data: FrontmatterData | undefined): PhaseEdges {
  if (!data) return { declared: false, needs: [], needsDeployed: [], sameFilesAs: [] };
  const pr = data.pr;
  return {
    declared: EDGE_KEYS.some((key) => key in data),
    needs: refList(data.needs),
    needsDeployed: refList(data["needs-deployed"]),
    sameFilesAs: refList(data["same-files-as"]),
    pr: typeof pr === "string" || typeof pr === "number" ? String(pr) : undefined,
  };
}

function refList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return items
    .filter((item) => typeof item === "string" || typeof item === "number")
    .map((item) => String(item).replace(/^phase\s+/i, "").trim())
    .filter((item) => item !== "" && item.toLowerCase() !== "none");
}

type NeedsOf = (id: string) => readonly string[] | undefined;

// The needs loop through `start` and back, e.g. ["3", "5", "3"]; refs that aren't phases are skipped.
export function needsCycle(needsOf: NeedsOf, start: string): string[] | undefined {
  const loop = walk(needsOf, start, start, new Set());
  return loop ? [start, ...loop] : undefined;
}

function walk(needsOf: NeedsOf, start: string, current: string, visited: Set<string>): string[] | undefined {
  for (const next of needsOf(current) ?? []) {
    if (next === start) return [start];
    if (visited.has(next) || needsOf(next) === undefined) continue;
    visited.add(next);
    const rest = walk(needsOf, start, next, visited);
    if (rest) return [next, ...rest];
  }
  return undefined;
}
