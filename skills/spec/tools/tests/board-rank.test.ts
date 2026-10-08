import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { rankReady, unblockCounts } from "../board/rank";
import { phaseEdges, phaseState } from "./factories";
import { boardInputs, NOW, readyRow, specFixture, workspaceView } from "./board-factories";

const phase = (id: string, needs?: string[], overrides = {}) =>
  phaseState({ id, edges: needs ? phaseEdges({ declared: true, needs }) : phaseEdges(), ...overrides });

describe("rankReady", () => {
  test("overdue, then priority, then due, then unblocks most, then most recently updated, then name", () => {
    const rows = [
      readyRow({ spec: "by-name-b" }),
      readyRow({ spec: "by-name-a" }),
      readyRow({ spec: "recent", updated: "2026-09-30" }),
      readyRow({ spec: "unblocks", unblocks: 2 }),
      readyRow({ spec: "due", due: "2026-10-14" }),
      readyRow({ spec: "p2", priority: "p2" }),
      readyRow({ spec: "p1", priority: "p1" }),
      readyRow({ spec: "late-p3", priority: "p3", overdue: true }),
    ];
    expect(rankReady(rows).map((row) => row.spec)).toEqual(["late-p3", "p1", "p2", "due", "unblocks", "recent", "by-name-a", "by-name-b"]);
  });

  test("focus rows come before every other row, by focus position; the rest keep today's order", () => {
    const rows = [readyRow({ spec: "late-p1", priority: "p1", overdue: true }), readyRow({ spec: "focus-2", focus: 2 }), readyRow({ spec: "p2", priority: "p2" }), readyRow({ spec: "focus-1", focus: 1, priority: "p3" })];
    expect(rankReady(rows).map((row) => row.spec)).toEqual(["focus-1", "focus-2", "late-p1", "p2"]);
  });

  test("keeps readySet's order between phases of one spec", () => {
    expect(rankReady([readyRow({ phase: "4" }), readyRow({ phase: "2" })]).map((row) => row.phase)).toEqual(["4", "2"]);
  });
});

describe("unblockCounts", () => {
  test("counts the open phases that need each phase, across specs and for whole-spec refs", () => {
    const alpha = specFixture("alpha", { phases: [phase("1", []), phase("2", ["1"]), phase("3", ["1"]), phase("4", ["1"], { done: true })] });
    const beta = specFixture("beta", { phases: [phase("1", ["alpha#1", "gamma"])] });
    const gamma = specFixture("gamma", { stage: "prep" });
    const linear = specFixture("linear", { phases: [phase("1"), phase("2")] });
    const { states, nodes } = boardInputs([alpha, beta, gamma, linear]);

    expect(unblockCounts(states, nodes)).toEqual(
      new Map([
        ["alpha#1", 3],
        ["gamma", 1],
        ["linear#1", 1],
      ]),
    );
  });
});

describe("buildBoard ranking", () => {
  test("ready rows carry their unblock counts and come out ranked", () => {
    const alpha = specFixture("alpha", { meta: { priority: "p2" }, phases: [phase("1", []), phase("2", ["1"])] });
    const beta = specFixture("beta", { meta: { priority: "p1" }, stage: "create" });
    const ready = buildBoard(boardInputs([alpha, beta]), NOW).lanes.ready;

    expect(ready.map((row) => [row.spec, row.phase, row.unblocks])).toEqual([
      ["beta", undefined, 0],
      ["alpha", "1", 1],
    ]);
  });
});

describe("★ (shares no files with anything in flight)", () => {
  const ticked = (id: string, extra = {}) => phase(id, [], { done: true, ...extra });

  test("a ready row loses ★ when its spec shares code-map files with a spec in flight, related or not", () => {
    const busy = specFixture("busy", { phases: [phase("1", [])], codeMapPaths: ["src/a.ts"] });
    const near = specFixture("near", { phases: [phase("1", [])], codeMapPaths: ["src/a.ts"], relations: [{ type: "related", target: "busy" }] });
    const far = specFixture("far", { phases: [phase("1", [])], codeMapPaths: ["src/z.ts"] });
    const busyTicked = specFixture("busy", { phases: [ticked("1")] });
    const ready = buildBoard(boardInputs([busy, near, far], { workspaces: [workspaceView("/wt/busy", [busyTicked])] }), NOW).lanes.ready;

    expect(ready.map((row) => [row.spec, row.safe, row.sharesWith])).toEqual([
      ["far", true, undefined],
      ["near", false, ["busy"]],
    ]);
  });

  test("a ready row loses ★ when a same-files-as sibling is in flight", () => {
    const sibling = (id: string, sameFilesAs: string[]) => phase(id, [], { edges: phaseEdges({ declared: true, sameFilesAs }) });
    const base = specFixture("alpha", { phases: [sibling("1", []), sibling("2", ["1"]), sibling("3", [])] });
    const started = { ...sibling("2", ["1"]), summary: { deliverables: { checked: 1, unchecked: 1 }, nextRun: [] } };
    const branch = specFixture("alpha", { phases: [sibling("1", []), started, sibling("3", [])] });
    const ready = buildBoard(boardInputs([base], { workspaces: [workspaceView("/wt/a", [branch])] }), NOW).lanes.ready;

    expect(ready.map((row) => [row.phase, row.safe])).toEqual([
      ["1", false],
      ["3", true],
    ]);
  });
});
