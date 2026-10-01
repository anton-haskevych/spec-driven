import type { SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { resolvePhaseRef } from "../ready/refs";

export interface KeyedPhase {
  key: string;
  done: boolean;
  deployed: boolean;
}

export function resolvedPhaseKeys(refs: readonly string[], state: SpecState, nodes: ReadonlyMap<string, SpecNode>): KeyedPhase[] {
  return refs.flatMap((ref) => {
    const resolution = resolvePhaseRef(ref, state, nodes);
    if (resolution.kind !== "ok") return [];
    return resolution.phases.map(({ label, done, deployed }) => ({ key: phaseKey(state.spec.name, label, nodes), done, deployed }));
  });
}

export function rowKey(row: { spec: string; phase?: string }): string {
  return row.phase === undefined ? row.spec : `${row.spec}#${row.phase}`;
}

function phaseKey(spec: string, label: string, nodes: ReadonlyMap<string, SpecNode>): string {
  return label.includes("#") || nodes.has(label) ? label : `${spec}#${label}`;
}
