import { describe, expect, test } from "bun:test";
import { parsePhaseEdges } from "../core/phase-edges";
import { parsePhaseLines } from "../core/progress";
import type { SpecState } from "../core/spec-state";
import { phaseEdgeIssues } from "../doctor/phase-edges";
import type { SpecNode } from "../graph/nodes";
import { phaseNeeds, readySet } from "../ready/ready-set";
import { phaseState, specNode } from "./factories";

const edges = (data: Record<string, unknown>) => parsePhaseEdges(data);
const noNodes = new Map<string, SpecNode>();

function state(phases: SpecState["phases"]): SpecState {
  return { spec: { name: "checkout", dir: "/specs/checkout" }, hasProgress: true, phases };
}

const safety = specNode({
  spec: { name: "safety", dir: "/specs/safety" },
  phases: [
    { id: "1", done: true, deployed: false },
    { id: "2", done: false, deployed: false },
  ],
});

describe("phaseNeeds", () => {
  test("declared edges are the needs list; a phase without frontmatter in a declared spec needs every earlier phase", () => {
    const declared = state([
      phaseState({ id: "1", edges: edges({ needs: [] }) }),
      phaseState({ id: "2", edges: edges({ needs: [1, "safety#2"] }) }),
      phaseState({ id: "3" }),
    ]);
    expect(declared.phases.map((phase, index) => phaseNeeds(declared, phase, index))).toEqual([[], ["1", "safety#2"], ["1", "2"]]);
  });

  test("with no edges anywhere, each phase directly needs the one before it", () => {
    const linear = state([phaseState({ id: "1" }), phaseState({ id: "2" }), phaseState({ id: "3" })]);
    expect(linear.phases.map((phase, index) => phaseNeeds(linear, phase, index))).toEqual([[], ["1"], ["2"]]);
  });
});

describe("parsePhaseEdges", () => {
  test("reads numbers, 'phase N' wording and 'none'", () => {
    expect(edges({ needs: [2, "phase 3", "none"], pr: 1 })).toEqual({
      declared: true,
      needs: ["2", "3"],
      needsDeployed: [],
      sameFilesAs: [],
      pr: "1",
    });
    expect(parsePhaseEdges(undefined).declared).toBe(false);
  });
});

describe("deployed marker", () => {
  test("reads a deployed note after a ticked phase's pointer", () => {
    const [line] = parsePhaseLines("- [x] Phase 2 — Agg → `phases/p2.md` · deployed 2026-09-20\n");
    expect(line?.deployed).toBe(true);
  });
});

describe("readySet", () => {
  const phases = [
    phaseState({ id: "1", done: true, deployed: false, edges: edges({ needs: [] }) }),
    phaseState({ id: "2", edges: edges({ needs: [1] }) }),
    phaseState({ id: "3", edges: edges({ needs: [1] }) }),
    phaseState({ id: "4", edges: edges({ needs: [2, 3], "needs-deployed": [1] }) }),
    phaseState({ id: "5", edges: edges({ needs: [] }) }),
    phaseState({ id: "6", edges: edges({ "same-files-as": [5] }) }),
    phaseState({ id: "7", edges: edges({ needs: ["safety#2"] }) }),
  ];

  test("lists every phase whose needs are met, and why the others wait", () => {
    const set = readySet(state(phases), new Map([["safety", safety]]));
    expect(set.ready.map((p) => p.id)).toEqual(["2", "3", "5"]);
    expect(set.waiting.map((w) => `${w.phase.id}: ${w.reasons.join("; ")}`)).toEqual([
      "4: needs 2; needs 3; needs deployed 1",
      "6: same files as 5; lands after it",
      "7: needs safety#2",
    ]);
  });

  test("an in-progress phase comes first and is not held back by a same-files sibling", () => {
    const wip = phaseState({ id: "6", edges: edges({ "same-files-as": [5] }), summary: { deliverables: { checked: 1, unchecked: 1 }, nextRun: [] } });
    const set = readySet(state([phaseState({ id: "5", edges: edges({ needs: [] }) }), wip]), noNodes);
    expect(set.ready.map((p) => p.id)).toEqual(["6"]);
    expect(set.waiting[0]?.reasons).toEqual(["same files as 6; lands after it"]);
  });

  test("falls back to progress.md order when no phase declares edges", () => {
    const set = readySet(state([phaseState({ id: "1" }), phaseState({ id: "2" })]), noNodes);
    expect(set.ready.map((p) => p.id)).toEqual(["1"]);
    expect(set.edgesDeclared).toBe(false);
  });
});

describe("whole-spec needs", () => {
  const giftCards = specNode({ spec: { name: "gift-cards", dir: "/specs/gift-cards" }, status: "prep" });
  const waitsOn = (node: SpecNode, field: "needs" | "needs-deployed" = "needs") =>
    readySet(state([phaseState({ id: "14", edges: edges({ [field]: [node.spec.name] }) })]), new Map([[node.spec.name, node]]));

  test("a spec with no phases yet resolves, and the phase waits until that spec is finished", () => {
    expect(waitsOn(giftCards).waiting[0]?.reasons).toEqual(["needs gift-cards"]);
    expect(phaseEdgeIssues(state([phaseState({ edges: edges({ needs: ["gift-cards"] }) })]), new Map([["gift-cards", giftCards]]))).toEqual([]);
    expect(waitsOn({ ...giftCards, status: "done" }).ready.map((p) => p.id)).toEqual(["14"]);
  });

  test("a finished status meets it even with phases left unticked", () => {
    expect(waitsOn({ ...safety, status: "abandoned" }).ready.map((p) => p.id)).toEqual(["14"]);
  });

  test("an open spec with phases still waits on each open phase, deploys included", () => {
    expect(waitsOn(safety).waiting[0]?.reasons).toEqual(["needs safety#2"]);
    const shipped = specNode({ ...safety, phases: [{ id: "1", done: true, deployed: false }] });
    expect(waitsOn(shipped, "needs-deployed").waiting[0]?.reasons).toEqual(["needs deployed safety#1"]);
  });
});

describe("phaseEdgeIssues", () => {
  test("reports references that do not resolve and needs cycles", () => {
    const broken = state([
      phaseState({ id: "1", edges: edges({ needs: [2] }) }),
      phaseState({ id: "2", pointer: "phases/phase-2.md", edges: edges({ needs: [1, 9, "ghost#1"] }) }),
    ]);
    const problems = phaseEdgeIssues(broken, noNodes).map((issue) => issue.problem);
    expect(problems).toContain("needs 9: no phase 9 in this spec");
    expect(problems).toContain("needs ghost#1: no spec named ghost");
    expect(problems).toContain("needs cycle: 1 → 2 → 1");
  });
});
