import type { PhaseState, SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { resolvePhaseRef } from "./refs";

export interface Waiting {
  phase: PhaseState;
  reasons: string[];
}

export interface ReadySet {
  ready: PhaseState[];
  waiting: Waiting[];
  edgesDeclared: boolean;
}

export function readySet(state: SpecState, nodes: ReadonlyMap<string, SpecNode>): ReadySet {
  const edgesDeclared = state.phases.some((phase) => phase.edges.declared);
  const ready: PhaseState[] = [];
  const waiting: Waiting[] = [];
  state.phases.forEach((phase, index) => {
    if (phase.done) return;
    const reasons = edgesDeclared ? declaredReasons(state, nodes, phase, index) : linearReasons(state, index);
    if (reasons.length > 0) waiting.push({ phase, reasons });
    else ready.push(phase);
  });
  return { ready: ready.toSorted((a, b) => Number(isWip(b)) - Number(isWip(a))), waiting, edgesDeclared };
}

export function isWip(phase: PhaseState): boolean {
  return !phase.done && (phase.summary?.deliverables.checked ?? 0) > 0;
}

function linearReasons(state: SpecState, index: number): string[] {
  const earlier = state.phases.slice(0, index).find((phase) => !phase.done);
  return earlier ? [`after phase ${earlier.id} (no edges declared, so order follows progress.md)`] : [];
}

function declaredReasons(state: SpecState, nodes: ReadonlyMap<string, SpecNode>, phase: PhaseState, index: number): string[] {
  const needs = phase.edges.declared ? phase.edges.needs : state.phases.slice(0, index).map((earlier) => earlier.id);
  return [
    ...unmet(needs, state, nodes, (p) => p.done, "needs"),
    ...unmet(phase.edges.needsDeployed, state, nodes, (p) => p.done && p.deployed, "needs deployed"),
    ...sameFilesWaits(state, phase, index),
  ];
}

function unmet(
  refs: readonly string[],
  state: SpecState,
  nodes: ReadonlyMap<string, SpecNode>,
  satisfied: (phase: { done: boolean; deployed: boolean }) => boolean,
  verb: string,
): string[] {
  return refs.flatMap((ref) => {
    const resolution = resolvePhaseRef(ref, state, nodes);
    if (resolution.kind === "unknown") return [`${verb} ${ref} (${resolution.reason})`];
    const open = resolution.phases.filter((phase) => !satisfied(phase)).map((phase) => phase.label);
    return open.length > 0 ? [`${verb} ${open.join(", ")}`] : [];
  });
}

function sameFilesWaits(state: SpecState, phase: PhaseState, index: number): string[] {
  if (isWip(phase)) return [];
  return state.phases.flatMap((other, otherIndex) => {
    const shares = phase.edges.sameFilesAs.includes(other.id) || other.edges.sameFilesAs.includes(phase.id);
    if (!shares || other.done || other === phase) return [];
    return isWip(other) || otherIndex < index ? [`same files as ${other.id}; lands after it`] : [];
  });
}
