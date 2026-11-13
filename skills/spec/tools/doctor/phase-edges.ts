import { join } from "node:path";
import { needsCycle } from "../core/phase-edges";
import type { PhaseState, SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { resolvePhaseRef } from "../ready/refs";
import { error, type Issue } from "./issue";

export function phaseEdgeIssues(state: SpecState, nodes: ReadonlyMap<string, SpecNode>, onlyPointer?: string): Issue[] {
  const phases = state.phases.filter((phase) => !onlyPointer || phase.pointer === onlyPointer);
  return [...phases.flatMap((phase) => unresolved(state, nodes, phase)), ...cycles(state, onlyPointer)];
}

function unresolved(state: SpecState, nodes: ReadonlyMap<string, SpecNode>, phase: PhaseState): Issue[] {
  const file = join(state.spec.dir, phase.pointer);
  const refs = [
    ...phase.edges.needs.map((ref) => ["needs", ref]),
    ...phase.edges.needsDeployed.map((ref) => ["needs-deployed", ref]),
    ...phase.edges.sameFilesAs.map((ref) => ["same-files-as", ref]),
  ];
  return refs.flatMap(([field, ref]) => {
    const resolution = resolvePhaseRef(ref ?? "", state, nodes);
    return resolution.kind === "unknown" ? [error(file, `${field} ${ref}: ${resolution.reason}`)] : [];
  });
}

function cycles(state: SpecState, onlyPointer?: string): Issue[] {
  const byId = new Map(state.phases.map((phase) => [phase.id, phase.edges.needs]));
  return state.phases.flatMap((phase) => {
    if (onlyPointer && phase.pointer !== onlyPointer) return [];
    const loop = needsCycle((id) => byId.get(id), phase.id);
    return loop ? [error(join(state.spec.dir, phase.pointer), `needs cycle: ${loop.join(" → ")}`)] : [];
  });
}
