import type { PhaseState, SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { parseRef, phasesInRef } from "../graph/relations";
import type { SpecSource } from "../plan/state-source";

const EDGE_FIELDS = [
  ["needs", "needs"],
  ["needs-deployed", "needsDeployed"],
  ["same-files-as", "sameFilesAs"],
] as const;

const PHASE_WORD = /^phase\s+/i;

export function refsToPhase(state: SpecState, phaseId: string, nodes: ReadonlyMap<string, SpecNode>, states: SpecSource): string[] {
  const local = (ref: string) => !ref.includes("#") && covers(ref.replace(PHASE_WORD, ""), phaseId);
  const external = (ref: string) => {
    const { target, phases } = parseRef(ref);
    return target === state.spec.name && phases !== undefined && covers(phases, phaseId);
  };
  const siblings = state.phases.filter((phase) => phase.id !== phaseId).flatMap((phase) => edgeRefs(`Phase ${phase.id}`, phase, local));
  const others = [...nodes.values()]
    .filter((node) => node.spec.name !== state.spec.name)
    .flatMap((node) => [...relationRefs(node, external), ...otherSpecEdgeRefs(states(node.spec), external)]);
  return [...siblings, ...others];
}

function edgeRefs(label: string, phase: PhaseState, matches: (ref: string) => boolean): string[] {
  return EDGE_FIELDS.flatMap(([field, key]) => phase.edges[key].filter(matches).map((ref) => `${label} ${field} ${ref}`));
}

function relationRefs(node: SpecNode, matches: (ref: string) => boolean): string[] {
  return node.relations
    .filter((relation) => relation.phases !== undefined && matches(`${relation.target}#${relation.phases}`))
    .map((relation) => `${node.spec.name} CLAUDE.md ${relation.type} ${relation.target}#${relation.phases}`);
}

function otherSpecEdgeRefs(other: SpecState, matches: (ref: string) => boolean): string[] {
  return other.phases.flatMap((phase) => edgeRefs(`${other.spec.name} Phase ${phase.id}`, phase, matches));
}

function covers(ref: string, phaseId: string): boolean {
  return phasesInRef(ref, [phaseId]).length > 0;
}
