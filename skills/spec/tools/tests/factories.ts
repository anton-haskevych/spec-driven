import type { PhaseLine } from "../core/progress";
import type { SpecMeta } from "../core/spec-meta";
import type { PhaseState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";

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
    schedule: { problems: [] },
    ...overrides,
  };
}

export function specMeta(overrides: Partial<SpecMeta> = {}): SpecMeta {
  return { area: [], domain: [], scope: [], ...overrides };
}

export function specNode(overrides: Partial<SpecNode> = {}): SpecNode {
  return {
    spec: { name: "checkout", dir: "/specs/checkout" },
    status: "active",
    phases: [],
    codeMapPaths: [],
    relations: [],
    meta: specMeta(),
    ...overrides,
  };
}
