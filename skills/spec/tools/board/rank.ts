import { compareSchedule } from "../core/schedule";
import type { SpecState } from "../core/spec-state";
import { isFinished, type SpecNode } from "../graph/nodes";
import { phaseNeeds } from "../ready/ready-set";
import type { ReadyRow } from "./model";
import { resolvedPhaseKeys } from "./phase-keys";

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
