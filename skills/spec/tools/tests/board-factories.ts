import type { BaseRef, BoardInputs, SpecStage, WorkspaceView } from "../board/inputs";
import { BOARD_VERSION, type Board, type FlightRow, type ReadyRow } from "../board/model";
import type { SpecMeta } from "../core/spec-meta";
import type { PhaseState, SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import type { PrRow } from "../pr/rollup";
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
  codeMapPaths?: string[];
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
      codeMapPaths: options.codeMapPaths ?? [],
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
    currentPath: "/repo",
    base: baseRef(),
    nodes: new Map(specs.map((fixture) => [fixture.node.spec.name, fixture.node])),
    states: new Map(specs.map((fixture) => [fixture.node.spec.name, fixture.state])),
    stages: new Map(specs.flatMap((fixture) => (fixture.stage ? [[fixture.node.spec.name, fixture.stage] as const] : []))),
    workspaces: [],
    counts: { merged: 0, unknownBase: 0, unreadable: 0, duplicates: [] },
    backlogCount: 0,
    sessions: "local",
    claims: [],
    prs: "local",
    prLinks: new Map(),
    ...overrides,
  };
}

// A worktree that changed these specs; a fixture absent from base becomes branch-only.
export function workspaceView(path: string, specs: readonly SpecFixture[], options: { branch?: string; isMain?: boolean; branchOnly?: boolean } = {}): WorkspaceView {
  return {
    path,
    branch: options.branch ?? path.split("/").at(-1),
    isMain: options.isMain ?? false,
    states: new Map(specs.map((fixture) => [fixture.node.spec.name, fixture.state])),
    branchOnly: new Map(options.branchOnly ? specs.map((fixture) => [fixture.node.spec.name, fixture.node]) : []),
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
    here: "/repo",
    mainCheckout: "/repo",
    base: { branch: "main", sha: "e43d948", date: "2026-10-01T13:40:00-07:00", mode: "fetched" },
    lanes: { inFlight: [], ready: [], blocked: [], needsYou: [] },
    footer: { merged: 0, unknownBase: 0, unreadable: 0, paused: 0, backlog: 0, duplicates: [] },
    ...overrides,
  };
}

export function prRow(overrides: Partial<PrRow> = {}): PrRow {
  const number = overrides.number ?? 1;
  return { number, branch: "feat/alpha-pr-a", state: "OPEN", draft: false, url: `https://x/pull/${number}`, ...overrides };
}
