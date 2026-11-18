import { describe, expect, test } from "bun:test";
import type { PhaseState, SpecState } from "../core/spec-state";
import type { PrDoc } from "../plan/docs/pr-doc";
import { specLayout } from "../pr/groups";
import { laneBranches, pruneCandidates, type LaneTreeFacts, type TreeFacts } from "../trees/prune-rules";
import type { Workspace } from "../workspaces/list";
import { phaseEdges, phaseState } from "./factories";

const facts = (path: string, head: string, branch: string | undefined, extra: Partial<Omit<TreeFacts, "worktree">> = {}): TreeFacts => ({
  worktree: { path, head, ...(branch ? { branch } : {}), detached: !branch, locked: false, prunable: false, isMain: false } satisfies Workspace,
  inBase: false,
  ...extra,
});
const merged = new Map([["feat/squashed", [{ number: 8, head: "s1" }]]]);

describe("pruneCandidates", () => {
  test("a clean, idle tree whose head is in base or is a merged PR's head", () => {
    const candidates = pruneCandidates([facts("/t/a", "a1", "feat/a", { inBase: true }), facts("/t/s", "s1", "feat/squashed"), facts("/t/codex", "c1", undefined, { inBase: true })], merged, "main");
    expect(candidates).toEqual([
      { path: "/t/a", branch: "feat/a", evidence: "in origin/main" },
      { path: "/t/s", branch: "feat/squashed", evidence: "#8 merged" },
      { path: "/t/codex", evidence: "in origin/main" },
    ]);
  });

  test("commits after the merged PR's head are unpushed work: kept", () => {
    expect(pruneCandidates([facts("/t/s", "s2", "feat/squashed")], merged, "main")).toEqual([]);
  });

  test("busy trees are kept, whatever their branch", () => {
    expect(pruneCandidates([facts("/t/b", "b1", "feat/b", { inBase: true, busy: "after x 1" })], merged, "main")).toEqual([]);
  });

  test("without PR data only base ancestry counts", () => {
    expect(pruneCandidates([facts("/t/s", "s1", "feat/squashed")], undefined, "main")).toEqual([]);
  });
});

describe("pruneCandidates, lane trees of spec-branch mode", () => {
  const lane = (extra: Partial<LaneTreeFacts> = {}): LaneTreeFacts => ({ spec: "x", specBranch: "feat/x", inSpecBranch: true, laneOpen: false, onlySpecDocsBeyond: true, ...extra });
  const tree = (extra: Partial<LaneTreeFacts> = {}) => facts("/t/x-pr-b", "h1", "feat/x-pr-b", { lane: lane(extra) });

  test("its lane is in feat/<spec>, has no open phase, and the tree adds only spec docs beyond it: merged", () => {
    expect(pruneCandidates([tree()], new Map(), "main")).toEqual([{ path: "/t/x-pr-b", branch: "feat/x-pr-b", evidence: "lane in origin/feat/x" }]);
  });

  test("kept while its lane has an open phase, isn't in feat/<spec>, or the tree holds code beyond it", () => {
    expect(pruneCandidates([tree({ laneOpen: true }), tree({ inSpecBranch: false }), tree({ onlySpecDocsBeyond: false })], new Map(), "main")).toEqual([]);
  });

  test("its lane document reads merged (the final PR, copied by Phase 5): merged, mode on or off", () => {
    expect(pruneCandidates([tree({ inSpecBranch: false, laneOpen: true, mergedPr: 31 })], new Map(), "main")).toEqual([{ path: "/t/x-pr-b", branch: "feat/x-pr-b", evidence: "#31 merged" }]);
    expect(pruneCandidates([tree({ mergedPr: 31, onlySpecDocsBeyond: false })], new Map(), "main")).toEqual([]);
  });

  test("a busy lane tree is kept", () => {
    expect(pruneCandidates([{ ...tree(), busy: "after x 4" }], new Map(), "main")).toEqual([]);
  });
});

describe("laneBranches", () => {
  const phase = (id: string, pr: string, done = false): PhaseState => phaseState({ id, done, edges: phaseEdges({ declared: true, pr }) });
  const state = (phases: PhaseState[]): SpecState => ({ spec: { name: "x", dir: "/specs/x" }, hasProgress: true, phases });
  const doc = (group: string, extra: Partial<PrDoc> = {}): PrDoc => ({ group, branch: `feat/x-pr-${group.toLowerCase()}`, state: "not-opened", ...extra });
  const phases = [phase("1", "A", true), phase("2", "B"), phase("3", "S", true)];

  test("in the mode: each lane by branch with its spec branch and whether a phase is open; ship-alone groups are no lanes", () => {
    const layouts = new Map([["x", specLayout(state(phases), { cutFrom: "c0ffee1", shipAlone: ["S"] })]]);
    expect(laneBranches(layouts, () => [doc("A"), doc("B")])).toEqual(
      new Map([
        ["feat/x-pr-a", { spec: "x", specBranch: "feat/x", laneOpen: false }],
        ["feat/x-pr-b", { spec: "x", specBranch: "feat/x", laneOpen: true }],
      ]),
    );
  });

  test("out of the mode: only groups whose document reads merged, with its number", () => {
    const layouts = new Map([["x", specLayout(state(phases))]]);
    expect(laneBranches(layouts, () => [doc("A", { state: "merged", number: 31 }), doc("B")])).toEqual(new Map([["feat/x-pr-a", { spec: "x", laneOpen: false, mergedPr: 31 }]]));
  });
});
