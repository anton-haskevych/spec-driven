import type { BaseRef, BoardInputs, SpecStage } from "../board/inputs";
import { BOARD_VERSION, type Board, type FlightRow, type ReadyRow } from "../board/model";
import type { SpecMeta } from "../core/spec-meta";
import type { PhaseState, SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { specMeta, specNode } from "./factories";

export const NOW = new Date("2026-10-01T20:00:00Z");

export interface SpecFixture {
  node: SpecNode;
  state: SpecState;
  stage?: SpecStage;
}

export interface SpecFixtureOptions {
  phases?: PhaseState[];
  meta?: Partial<SpecMeta>;
  status?: string;
  stage?: SpecStage;
  relations?: SpecNode["relations"];
}

export function specFixture(name: string, options: SpecFixtureOptions = {}): SpecFixture {
  const spec = { name, dir: `/base/docs/specs/${name}` };
  const phases = options.phases ?? [];
  return {
    node: specNode({
      spec,
      status: options.status ?? "active",
      phases: phases.map(({ id, done, deployed }) => ({ id, done, deployed })),
      relations: options.relations ?? [],
      meta: specMeta(options.meta),
    }),
    state: { spec, hasProgress: options.stage === undefined, phases },
    stage: options.stage,
  };
}

export function baseRef(overrides: Partial<BaseRef> = {}): BaseRef {
  return { branch: "main", sha: "e43d948", date: "2026-10-01T13:40:00-07:00", fetch: { ok: true, value: undefined }, ...overrides };
}

export function boardInputs(specs: readonly SpecFixture[], overrides: Partial<BoardInputs> = {}): BoardInputs {
  return {
    repo: "crm",
    base: baseRef(),
    nodes: new Map(specs.map((fixture) => [fixture.node.spec.name, fixture.node])),
    states: new Map(specs.map((fixture) => [fixture.node.spec.name, fixture.state])),
    stages: new Map(specs.flatMap((fixture) => (fixture.stage ? [[fixture.node.spec.name, fixture.stage] as const] : []))),
    counts: { merged: 0, unknownBase: 0, unreadable: 0, duplicates: [] },
    backlogCount: 0,
    ...overrides,
  };
}

export function readyRow(overrides: Partial<ReadyRow> = {}): ReadyRow {
  return { spec: "alpha", phase: "1", next: "execute", overdue: false, unblocks: 0, safe: true, target: { newWorktree: "alpha-1" }, ...overrides };
}

export function flightRow(overrides: Partial<FlightRow> = {}): FlightRow {
  return { spec: "alpha", phase: "1", next: "executing", ...overrides };
}

export function board(overrides: Partial<Board> = {}): Board {
  return {
    version: BOARD_VERSION,
    repo: "crm",
    generatedAt: NOW.toISOString(),
    base: { branch: "main", sha: "e43d948", date: "2026-10-01T13:40:00-07:00", mode: "fetched" },
    lanes: { inFlight: [], ready: [], blocked: [], needsYou: [] },
    footer: { merged: 0, unknownBase: 0, unreadable: 0, paused: 0, backlog: 0, duplicates: [] },
    ...overrides,
  };
}
