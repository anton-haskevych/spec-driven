import type { SpecState } from "../core/spec-state";
import { hasFinishedStatus, isFinished, type SpecNode } from "../graph/nodes";
import { parseRef, phasesInRef } from "../graph/relations";

export interface ResolvedPhase {
  label: string;
  done: boolean;
  deployed: boolean;
}

export type Resolution = { kind: "ok"; phases: ResolvedPhase[] } | { kind: "unknown"; reason: string };

const PHASE_WORD = /^phase\s+/i;

export function resolvePhaseRef(rawRef: string, state: SpecState, nodes: ReadonlyMap<string, SpecNode>): Resolution {
  const ref = rawRef.replace(PHASE_WORD, "").trim();
  if (!ref.includes("#") && !nodes.has(ref)) return resolveLocal(ref, state);
  const { target, phases } = parseRef(ref);
  const node = nodes.get(target);
  if (!node) return { kind: "unknown", reason: `no spec named ${target}` };
  if (!phases && (node.phases.length === 0 || hasFinishedStatus(node))) return { kind: "ok", phases: [wholeSpecMark(node)] };
  const marks = phases ? node.phases.filter((mark) => phasesInRef(phases, node.phases.map((m) => m.id)).includes(mark.id)) : node.phases;
  if (marks.length === 0) return { kind: "unknown", reason: `${target} has no phase ${phases ?? ""}`.trim() };
  return { kind: "ok", phases: marks.map((mark) => ({ label: `${target}#${mark.id}`, done: mark.done, deployed: mark.deployed })) };
}

// A spec with no phases yet (still in prep), or closed by its status, is met as a whole once it is finished.
function wholeSpecMark(node: SpecNode): ResolvedPhase {
  const finished = isFinished(node);
  return { label: node.spec.name, done: finished, deployed: finished };
}

function resolveLocal(ref: string, state: SpecState): Resolution {
  const ids = phasesInRef(ref, state.phases.map((phase) => phase.id));
  if (ids.length === 0) return { kind: "unknown", reason: `no phase ${ref} in this spec` };
  const phases = state.phases.filter((phase) => ids.includes(phase.id));
  return { kind: "ok", phases: phases.map((phase) => ({ label: phase.id, done: phase.done, deployed: phase.deployed })) };
}
