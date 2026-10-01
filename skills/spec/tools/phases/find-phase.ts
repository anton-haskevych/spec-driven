import { samePhase } from "../core/phase-title";
import type { PhaseState, SpecState } from "../core/spec-state";
import { normalizePhaseHint } from "../context/request";

export function findPhase(state: SpecState, rawId: string): PhaseState | string {
  const id = normalizePhaseHint(rawId);
  const phase = state.phases.find((candidate) => samePhase(candidate.id, id));
  return phase ?? `no Phase ${id} in ${state.spec.name}; phases: ${state.phases.map((p) => p.id).join(", ")}`;
}
