import { needsCycle } from "../core/phase-edges";
import type { PhaseState, SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { resolvedPhaseKeys } from "../board/phase-keys";
import { isWip, phaseNeeds, type Waiting } from "./ready-set";
import { resolvePhaseRef } from "./refs";

// "Batch", never "wave": a wave is already a recon wave in this plugin.
export interface BuildOrder {
  batches: PhaseState[][];
  longest: PhaseState[];
  waiting: Waiting[];
  sameFiles: { first: PhaseState; then: PhaseState }[];
  cycle?: string[];
}

type Edges = Map<string, string[]>;

export function buildOrder(state: SpecState, nodes: ReadonlyMap<string, SpecNode>): BuildOrder {
  const open = state.phases.filter((phase) => !phase.done);
  const edges: Edges = new Map(open.map((phase) => [phase.id, []]));
  const waiting: Waiting[] = [];
  for (const phase of open) {
    const reasons = addOpenNeedsAndListWaits(state, nodes, phase, edges);
    if (reasons.length > 0) waiting.push({ phase, reasons });
  }
  const loop = open.map((phase) => needsCycle((id) => edges.get(id), phase.id)).find((found) => found !== undefined);
  if (loop) return { batches: [], longest: [], waiting, sameFiles: [], cycle: loop };
  const sameFiles = orientSameFiles(open, edges);
  const depth = depthsOf(open, edges);
  return { batches: batchesOf(open, depth), longest: longestChain(open, edges, depth), waiting, sameFiles };
}

function addOpenNeedsAndListWaits(state: SpecState, nodes: ReadonlyMap<string, SpecNode>, phase: PhaseState, edges: Edges): string[] {
  const needs = needsOf(state, phase).flatMap((ref) => resolveNeed(state, nodes, ref, "needs", (target) => target.done));
  const deployed = phase.edges.needsDeployed.flatMap((ref) => resolveNeed(state, nodes, ref, "needs deployed", (target) => target.done && target.deployed));
  const reasons: string[] = [];
  for (const need of [...needs, ...deployed]) {
    if (need.kind === "edge") edges.get(phase.id)?.push(need.id);
    else if (need.kind === "wait") reasons.push(need.reason);
  }
  return reasons;
}

// readySet's rule, not phaseNeeds': a linear phase waits on the nearest earlier *open* phase.
function needsOf(state: SpecState, phase: PhaseState): string[] {
  const index = state.phases.indexOf(phase);
  if (state.phases.some((candidate) => candidate.edges.declared)) return phaseNeeds(state, phase, index);
  const earlier = state.phases.slice(0, index).findLast((candidate) => !candidate.done);
  return earlier ? [earlier.id] : [];
}

type Need = { kind: "edge"; id: string } | { kind: "met" } | { kind: "wait"; reason: string };

function resolveNeed(
  state: SpecState,
  nodes: ReadonlyMap<string, SpecNode>,
  ref: string,
  verb: "needs" | "needs deployed",
  met: (target: { done: boolean; deployed: boolean }) => boolean,
): Need[] {
  const resolution = resolvePhaseRef(ref, state, nodes);
  if (resolution.kind === "unknown") return [{ kind: "wait", reason: `needs ${ref} (${resolution.reason})` }];
  const own = `${state.spec.name}#`;
  return resolvedPhaseKeys([ref], state, nodes).map((target): Need => {
    const local = target.key.startsWith(own) ? target.key.slice(own.length) : undefined;
    if (local !== undefined && !target.done) return { kind: "edge", id: local };
    if (met(target)) return { kind: "met" };
    const shown = local ?? target.key;
    return { kind: "wait", reason: verb === "needs" || !target.done ? `needs ${shown}` : `needs ${shown} deployed` };
  });
}

// As readySet runs a pair: a phase in progress first, else progress.md order. A needs path overrides both,
// so the batches stay acyclic.
function orientSameFiles(open: readonly PhaseState[], edges: Edges): BuildOrder["sameFiles"] {
  const pairs: BuildOrder["sameFiles"] = [];
  open.forEach((a, index) => {
    for (const b of open.slice(index + 1)) {
      if (!a.edges.sameFilesAs.includes(b.id) && !b.edges.sameFilesAs.includes(a.id)) continue;
      const preferred = isWip(b) && !isWip(a) ? { first: b, then: a } : { first: a, then: b };
      const pair = reaches(edges, preferred.first.id, preferred.then.id) ? { first: preferred.then, then: preferred.first } : preferred;
      edges.get(pair.then.id)?.push(pair.first.id);
      pairs.push(pair);
    }
  });
  return pairs;
}

function reaches(edges: Edges, from: string, to: string, seen = new Set<string>()): boolean {
  return (edges.get(from) ?? []).some((next) => next === to || (!seen.has(next) && seen.add(next) && reaches(edges, next, to, seen)));
}

function depthsOf(open: readonly PhaseState[], edges: Edges): Map<string, number> {
  const depth = new Map<string, number>();
  const of = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    const value = Math.max(-1, ...(edges.get(id) ?? []).map(of)) + 1;
    depth.set(id, value);
    return value;
  };
  for (const phase of open) of(phase.id);
  return depth;
}

function batchesOf(open: readonly PhaseState[], depth: ReadonlyMap<string, number>): PhaseState[][] {
  const batches: PhaseState[][] = [];
  for (const phase of open) {
    const at = depth.get(phase.id) ?? 0;
    (batches[at] ??= []).push(phase);
  }
  return batches;
}

function longestChain(open: readonly PhaseState[], edges: Edges, depth: ReadonlyMap<string, number>): PhaseState[] {
  const deepest = Math.max(-1, ...depth.values());
  let current = open.find((phase) => depth.get(phase.id) === deepest);
  const chain: PhaseState[] = [];
  while (current) {
    chain.unshift(current);
    const below = (depth.get(current.id) ?? 0) - 1;
    const preds = new Set(edges.get(current.id));
    current = open.find((phase) => preds.has(phase.id) && depth.get(phase.id) === below);
  }
  return chain;
}

export interface ShipAloneSuggestion {
  group: string;
  targets: string[];
}

// Only a suggestion for the overseer: a group another phase needs deployed may need to reach main first.
export function shipAloneSuggestions(state: SpecState, nodes: ReadonlyMap<string, SpecNode>): ShipAloneSuggestion[] {
  const own = `${state.spec.name}#`;
  const targetIds = new Set(
    state.phases
      .filter((phase) => !phase.done)
      .flatMap((phase) => resolvedPhaseKeys(phase.edges.needsDeployed, state, nodes))
      .filter((target) => !target.deployed && target.key.startsWith(own))
      .map((target) => target.key.slice(own.length)),
  );
  const byGroup = new Map<string, string[]>();
  for (const phase of state.phases) {
    if (targetIds.has(phase.id) && phase.edges.pr !== undefined) byGroup.set(phase.edges.pr, [...(byGroup.get(phase.edges.pr) ?? []), phase.id]);
  }
  return [...byGroup.entries()].map(([group, targets]) => ({ group, targets }));
}
