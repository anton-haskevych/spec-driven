import { join } from "node:path";
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
  const byId = new Map(state.phases.map((phase) => [phase.id, phase]));
  return state.phases.flatMap((phase) => {
    if (onlyPointer && phase.pointer !== onlyPointer) return [];
    const loop = walk(byId, phase.id, phase.id, new Set());
    return loop ? [error(join(state.spec.dir, phase.pointer), `needs cycle: ${[phase.id, ...loop].join(" → ")}`)] : [];
  });
}

function walk(byId: ReadonlyMap<string, PhaseState>, start: string, current: string, visited: Set<string>): string[] | undefined {
  for (const next of byId.get(current)?.edges.needs ?? []) {
    if (next === start) return [start];
    if (visited.has(next) || !byId.has(next)) continue;
    visited.add(next);
    const rest = walk(byId, start, next, visited);
    if (rest) return [next, ...rest];
  }
  return undefined;
}
