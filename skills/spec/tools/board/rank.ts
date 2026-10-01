import { compareSchedule } from "../core/schedule";
import type { SpecState } from "../core/spec-state";
import { isFinished, type SpecNode } from "../graph/nodes";
import { inFlightOverlaps } from "../graph/overlap";
import { phaseNeeds } from "../ready/ready-set";
import type { FlightRow, ReadyRow } from "./model";
import { resolvedPhaseKeys, rowKey } from "./phase-keys";

export function rankReady(rows: readonly ReadyRow[]): ReadyRow[] {
  return rows.toSorted(
    (a, b) =>
      Number(b.overdue) - Number(a.overdue) ||
      compareSchedule(a, b) ||
      b.unblocks - a.unblocks ||
      (b.updated ?? "").localeCompare(a.updated ?? "") ||
      a.spec.localeCompare(b.spec),
  );
}

export function unblockCounts(states: ReadonlyMap<string, SpecState>, nodes: ReadonlyMap<string, SpecNode>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const state of states.values()) {
    const node = nodes.get(state.spec.name);
    if (node && isFinished(node)) continue;
    state.phases.forEach((phase, index) => {
      if (phase.done) return;
      const refs = [...phaseNeeds(state, phase, index), ...phase.edges.needsDeployed];
      const keys = new Set(resolvedPhaseKeys(refs, state, nodes).map((target) => target.key));
      for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
  }
  return counts;
}

// ★ = this row can start now without touching files that work in flight is changing.
export function markSafe(rows: readonly ReadyRow[], inFlight: readonly FlightRow[], nodes: ReadonlyMap<string, SpecNode>, states: ReadonlyMap<string, SpecState>): ReadyRow[] {
  const flyingSpecs = new Set(inFlight.map((row) => row.spec));
  const flyingKeys = new Set(inFlight.map(rowKey));
  return rows.map((row) => {
    if (!row.safe) return row;
    const sharesWith = inFlightOverlaps(nodes, row.spec, flyingSpecs).map((overlap) => overlap.other);
    if (sharesWith.length === 0 && !hasSameFilesSiblingInFlight(row, states.get(row.spec), flyingKeys)) return row;
    return { ...row, safe: false, ...(sharesWith.length > 0 ? { sharesWith } : {}) };
  });
}

function hasSameFilesSiblingInFlight(row: ReadyRow, state: SpecState | undefined, flyingKeys: ReadonlySet<string>): boolean {
  const phase = state?.phases.find((candidate) => candidate.id === row.phase);
  if (!state || !phase) return false;
  const siblings = state.phases.filter((other) => phase.edges.sameFilesAs.includes(other.id) || other.edges.sameFilesAs.includes(phase.id));
  return siblings.some((sibling) => flyingKeys.has(rowKey({ spec: row.spec, phase: sibling.id })));
}
