import { describe, expect, test } from "bun:test";
import { parsePhaseEdges } from "../core/phase-edges";
import type { PhaseState, SpecState } from "../core/spec-state";
import type { SpecNode } from "../graph/nodes";
import { buildOrder } from "../ready/build-order";
import { phaseState, specNode } from "./factories";

const edges = (data: Record<string, unknown>) => parsePhaseEdges(data);
const noNodes = new Map<string, SpecNode>();
const wip = { summary: { deliverables: { checked: 1, unchecked: 1 }, nextRun: [] } };

function spec(phases: PhaseState[]): SpecState {
  return { spec: { name: "x", dir: "/specs/x" }, hasProgress: true, phases };
}

const phase = (id: string, data?: Record<string, unknown>, extra: Partial<PhaseState> = {}) =>
  phaseState({ id, name: `P${id}`, ...(data ? { edges: edges(data) } : {}), ...extra });
const batchIds = (state: SpecState, nodes = noNodes) => buildOrder(state, nodes).batches.map((batch) => batch.map((p) => p.id));
const longestIds = (state: SpecState, nodes = noNodes) => buildOrder(state, nodes).longest.map((p) => p.id);

describe("buildOrder on a linear spec (no edges declared)", () => {
  test("one phase per batch, in progress.md order, done phases left out", () => {
    const state = spec([phase("1", undefined, { done: true }), phase("2"), phase("3")]);
    expect(batchIds(state)).toEqual([["2"], ["3"]]);
    expect(longestIds(state)).toEqual(["2", "3"]);
  });

  test("a done phase after an open one still waits for it, as readySet says", () => {
    const state = spec([phase("1"), phase("2", undefined, { done: true }), phase("3")]);
    expect(batchIds(state)).toEqual([["1"], ["3"]]);
  });
});

describe("buildOrder on declared edges", () => {
  const state = spec([
    phase("1", { needs: [] }, { done: true }),
    phase("2", { needs: [1] }),
    phase("3a", { needs: [] }),
    phase("4", { needs: [2] }),
    phase("6", { needs: [4, "3a"] }),
    phase("9", { needs: [] }),
    phase("10", { needs: [6] }),
  ]);

  test("batches by longest path; batch 0 is ready now", () => {
    expect(batchIds(state)).toEqual([["2", "3a", "9"], ["4"], ["6"], ["10"]]);
  });

  test("the longest chain, ties going by phase order", () => {
    expect(longestIds(state)).toEqual(["2", "4", "6", "10"]);
    expect(longestIds(spec([phase("1", { needs: [] }), phase("2", { needs: [] })]))).toEqual(["1"]);
  });

  test("a range need covers every phase in it, 4a included", () => {
    const ranged = spec([phase("4", { needs: [] }), phase("4a", { needs: [] }), phase("5", { needs: [] }), phase("6", { needs: ["4-5"] })]);
    expect(batchIds(ranged)).toEqual([["4", "4a", "5"], ["6"]]);
  });

  test("task phases take their place like code phases", () => {
    const tasked = spec([phase("1", { needs: [] }, { code: false }), phase("2", { needs: [1] })]);
    expect(batchIds(tasked)).toEqual([["1"], ["2"]]);
  });
});

describe("buildOrder waits from outside the spec's own open phases", () => {
  const other = specNode({
    spec: { name: "other", dir: "/specs/other" },
    phases: [
      { id: "1", done: true, deployed: false },
      { id: "8", done: false, deployed: false },
    ],
  });
  const nodes = new Map([["other", other]]);

  test("another spec's open phase and an unknown ref wait; a done one is met", () => {
    const state = spec([phase("1", { needs: ["other#8"] }), phase("2", { needs: ["other#1"] }), phase("3", { needs: ["nope#1"] })]);
    const order = buildOrder(state, nodes);
    expect(order.batches.map((batch) => batch.map((p) => p.id))).toEqual([["1", "2", "3"]]);
    expect(order.waiting.map((wait) => [wait.phase.id, wait.reasons])).toEqual([
      ["1", ["needs other#8"]],
      ["3", ["needs nope#1 (no spec named nope)"]],
    ]);
  });

  test("needs-deployed: an open phase is an edge, a done one waits for its deploy, a deployed one is met", () => {
    const state = spec([
      phase("1", { needs: [] }, { done: true }),
      phase("2", { needs: [] }, { done: true, deployed: true }),
      phase("3", { needs: [] }),
      phase("4", { "needs-deployed": [1, 2] }),
      phase("5", { "needs-deployed": [3] }),
    ]);
    const order = buildOrder(state, noNodes);
    expect(order.batches.map((batch) => batch.map((p) => p.id))).toEqual([["3", "4"], ["5"]]);
    expect(order.waiting.map((wait) => [wait.phase.id, wait.reasons])).toEqual([["4", ["needs 1 deployed"]]]);
  });
});

describe("buildOrder with same-files pairs", () => {
  test("the later of a pair goes one batch after the earlier", () => {
    const state = spec([phase("5", { needs: [] }), phase("6", { "same-files-as": [5] })]);
    const order = buildOrder(state, noNodes);
    expect(order.batches.map((batch) => batch.map((p) => p.id))).toEqual([["5"], ["6"]]);
    expect(order.sameFiles.map(({ first, then }) => [first.id, then.id])).toEqual([["5", "6"]]);
  });

  test("a phase in progress goes first, as readySet runs it", () => {
    const state = spec([phase("5", { needs: [] }), phase("6", { "same-files-as": [5] }, wip)]);
    expect(batchIds(state)).toEqual([["6"], ["5"]]);
  });

  test("a needs path decides the pair's order, so it never loops", () => {
    const state = spec([phase("5", { needs: [6] }), phase("6", { "same-files-as": [5] })]);
    expect(batchIds(state)).toEqual([["6"], ["5"]]);
  });
});

describe("buildOrder on a cycle", () => {
  test("names the loop over resolved keys and lays out nothing", () => {
    const state = spec([phase("4", { "needs-deployed": [6] }), phase("6", { needs: [4] })]);
    const order = buildOrder(state, noNodes);
    expect(order.cycle).toEqual(["4", "6", "4"]);
    expect(order.batches).toEqual([]);
    expect(order.longest).toEqual([]);
  });
});
