import type { PhaseLine } from "../core/progress";
import type { PhaseState } from "../core/spec-state";

export function phaseLine(overrides: Partial<PhaseLine> = {}): PhaseLine {
  return { done: false, deployed: false, title: "Phase 1 — One", pointer: "phases/phase-1.md", ...overrides };
}

export function phaseState(overrides: Partial<PhaseState> = {}): PhaseState {
  return {
    id: "1",
    name: "One",
    done: false,
    deployed: false,
    pointer: "phases/phase-1.md",
    edges: { declared: false, needs: [], needsDeployed: [], sameFilesAs: [] },
    summary: { deliverables: { checked: 0, unchecked: 1 }, nextRun: [] },
    ...overrides,
  };
}
