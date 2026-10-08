import type { SpecNode } from "../graph/nodes";

export interface FocusEntry {
  spec: string;
  rank: number;
}

export type FocusPlace = { kind: "end" } | { kind: "top" } | { kind: "after"; spec: string };

export const RANK_STEP = 10;

export function focusEntries(nodes: ReadonlyMap<string, SpecNode>): FocusEntry[] {
  return [...nodes.values()].flatMap((node) => (node.meta.focus === undefined ? [] : [{ spec: node.spec.name, rank: node.meta.focus }]));
}

export function sortFocus(entries: readonly FocusEntry[]): FocusEntry[] {
  return entries.toSorted((a, b) => a.rank - b.rank || a.spec.localeCompare(b.spec));
}

// Never renumbers: the result depends only on the others, so a write touches one spec.
export function rankFor(entries: readonly FocusEntry[], spec: string, place: FocusPlace): number | undefined {
  const others = sortFocus(entries.filter((entry) => entry.spec !== spec));
  const first = others[0];
  const last = others.at(-1);
  if (place.kind === "end") return last ? last.rank + RANK_STEP : RANK_STEP;
  if (place.kind === "top") return first ? topOf(first.rank) : RANK_STEP;

  const anchor = others.find((entry) => entry.spec === place.spec);
  if (!anchor) return undefined;
  const next = others.find((entry) => entry.rank > anchor.rank);
  return next ? (anchor.rank + next.rank) / 2 : anchor.rank + RANK_STEP;
}

export function focusPosition(entries: readonly FocusEntry[], spec: string): { position: number; total: number } | undefined {
  const index = sortFocus(entries).findIndex((entry) => entry.spec === spec);
  return index === -1 ? undefined : { position: index + 1, total: entries.length };
}

function topOf(lowest: number): number {
  return lowest - RANK_STEP >= 0 ? lowest - RANK_STEP : lowest / 2;
}
