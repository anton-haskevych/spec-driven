import type { BacklogItem } from "../backlog/items";
import type { HeldClaim } from "../claims/rules";
import type { Claim } from "../claims/store";
import type { PhaseEdges } from "../core/phase-edges";
import type { PhaseLine } from "../core/progress";
import type { SpecMeta } from "../core/spec-meta";
import type { PhaseState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import type { SpecRow } from "../portfolio/rows";
import type { LiveSession } from "../sessions/live";

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
    edges: phaseEdges(),
    summary: { deliverables: { checked: 0, unchecked: 1 }, nextRun: [] },
    schedule: { problems: [] },
    code: true,
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

export function specRowOf(overrides: Partial<SpecRow> = {}): SpecRow {
  return {
    name: "checkout",
    root: "docs/specs",
    status: "active",
    finished: false,
    area: [],
    domain: [],
    scope: [],
    overdue: false,
    progress: { done: 0, total: 0 },
    ...overrides,
  };
}

export function backlogItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return { file: "docs/specs/_backlog/idea.md", slug: "idea", title: "An idea", body: "", tags: [], ...overrides };
}

export function phaseEdges(overrides: Partial<PhaseEdges> = {}): PhaseEdges {
  return { declared: false, needs: [], needsDeployed: [], sameFilesAs: [], ...overrides };
}

export function liveSession(overrides: Partial<LiveSession> = {}): LiveSession {
  return { pid: 1, sessionId: "session-1", cwd: "/repo", status: "idle", updatedAt: new Date("2026-10-01T20:00:00Z"), updatedFrom: "updatedAt", procStart: "x", ...overrides };
}

export function claim(overrides: Partial<Claim> = {}): Claim {
  return { spec: "alpha", phase: "1", sessionId: "session-1", workspace: "/repo", claimedAt: "2026-10-01T20:00:00.000Z", ...overrides };
}

export function heldClaim(status: HeldClaim["status"], overrides: Partial<Claim> = {}): HeldClaim {
  return { claim: claim(overrides), status };
}
