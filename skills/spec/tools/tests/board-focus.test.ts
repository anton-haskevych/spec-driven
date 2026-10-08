import { describe, expect, test } from "bun:test";
import type { BoardInputs } from "../board/inputs";
import { buildBoard } from "../board/lanes";
import type { SpecMeta } from "../core/spec-meta";
import type { PhaseState } from "../core/spec-state";
import { boardInputs, NOW, prRow, specFixture, workspaceView, type SpecFixture, type SpecFixtureOptions } from "./board-factories";
import { heldClaim, liveSession, phaseEdges, phaseState } from "./factories";

const phase = (id: string, extra: Partial<PhaseState> = {}) => phaseState({ id, edges: phaseEdges({ declared: true, needs: [] }), ...extra });
const focused = (name: string, focus: number, options: SpecFixtureOptions & { meta?: Partial<SpecMeta> } = {}): SpecFixture =>
  specFixture(name, { phases: [phase("1")], ...options, meta: { focus, ...options.meta } });

const focusOf = (specs: SpecFixture[], overrides: Partial<BoardInputs> = {}) => buildBoard(boardInputs(specs, overrides), NOW);

describe("FOCUS lane rows", () => {
  test("one row per focus spec, by rank then name; specs without focus get none", () => {
    const board = focusOf([focused("b", 20), focused("a", 20), focused("c", 5), specFixture("plain", { phases: [phase("1")] })]);
    expect(board.lanes.focus.map((row) => [row.spec, row.rank])).toEqual([
      ["c", 5],
      ["a", 20],
      ["b", 20],
    ]);
  });

  test("no focus anywhere: no rows and no other sessions, whatever sessions run", () => {
    const board = focusOf([specFixture("plain", { phases: [phase("1")] })], { sessions: { ok: true, value: [liveSession({ cwd: "/repo" })] }, worktreePaths: ["/repo"] });
    expect(board.lanes.focus).toEqual([]);
    expect(board.footer).not.toHaveProperty("otherSessions");
  });

  test("progress, due and overdue come from the spec; a spec without phases shows its stage", () => {
    const board = focusOf([
      focused("late", 1, { phases: [phase("1", { done: true }), phase("2")], meta: { due: "2026-09-01" } }),
      focused("soon", 2, { meta: { due: "2026-10-20" } }),
      focused("fresh", 3, { phases: [], stage: "prep" }),
    ]);
    expect(board.lanes.focus.map(({ spec, progress, stage, due, overdue }) => ({ spec, progress, stage, due, overdue }))).toEqual([
      { spec: "late", progress: { done: 1, total: 2 }, stage: undefined, due: "2026-09-01", overdue: true },
      { spec: "soon", progress: { done: 0, total: 1 }, stage: undefined, due: "2026-10-20", overdue: false },
      { spec: "fresh", progress: undefined, stage: "prep", due: undefined, overdue: false },
    ]);
  });
});

describe("FOCUS now", () => {
  const nowOf = (specs: SpecFixture[], overrides: Partial<BoardInputs> = {}) => focusOf(specs, overrides).lanes.focus.map((row) => row.now);

  test("in flight first: the phases and their next steps", () => {
    const claims = [heldClaim("live", { spec: "f", phase: "1", workspace: "/wt/f" })];
    expect(nowOf([focused("f", 1, { phases: [phase("1"), phase("2")] })], { claims })).toEqual([{ kind: "flight", phases: ["1"], next: ["executing"] }]);
  });

  test("then ready phases, or the stage's next step", () => {
    expect(nowOf([focused("f", 1, { phases: [phase("1"), phase("2")] }), focused("g", 2, { phases: [], stage: "create" })])).toEqual([
      { kind: "ready", phases: ["1", "2"], step: "execute" },
      { kind: "ready", phases: [], step: "create" },
    ]);
  });

  test("then the undeployed phases it waits on", () => {
    const phases = [phase("1", { done: true }), phase("2", { edges: phaseEdges({ declared: true, needs: [], needsDeployed: ["1"] }) })];
    expect(nowOf([focused("f", 1, { phases })])).toEqual([{ kind: "deploy", phases: ["1"] }]);
  });

  test("then the first blocked reason", () => {
    const phases = [phase("1", { edges: phaseEdges({ declared: true, needs: ["other#1"] }) })];
    const [now] = nowOf([focused("f", 1, { phases }), specFixture("other", { phases: [phase("1")] })]);
    expect(now).toMatchObject({ kind: "blocked" });
  });

  test("a paused spec is paused", () => {
    expect(nowOf([focused("f", 1, { status: "paused" })])).toEqual([{ kind: "paused" }]);
  });

  test("a finished spec shows while a linked PR is open, and hides once none is", () => {
    const done = focused("f", 1, { phases: [phase("1", { done: true })] });
    const prLinks = new Map([["f", [4, 5]]]);
    expect(nowOf([done], { prLinks, prs: { ok: true, value: [prRow({ number: 4, state: "MERGED" }), prRow({ number: 5 })] } })).toEqual([{ kind: "merging", pr: 5 }]);
    expect(nowOf([done], { prLinks, prs: { ok: true, value: [prRow({ number: 5, state: "MERGED" })] } })).toEqual([]);
    expect(nowOf([done], { prLinks, prs: "local" })).toEqual([]);
  });

  test("abandoned and good-enough specs hide even with an open PR", () => {
    const prs = { ok: true as const, value: [prRow({ number: 5 })] };
    for (const status of ["abandoned", "good-enough"]) expect(nowOf([focused("f", 1, { status })], { prLinks: new Map([["f", [5]]]), prs })).toEqual([]);
  });

  test("nothing else applies: none", () => {
    const phases = [phase("1", { done: true }), phase("2", { edges: phaseEdges({ declared: true, needs: [] }) })];
    const claims = [heldClaim("live", { spec: "f", phase: "2", workspace: "/wt/f" })];
    expect(nowOf([focused("f", 1, { phases, status: "active" }), focused("g", 2, { phases: [] })], { claims })[1]).toEqual({ kind: "none" });
  });
});

describe("FOCUS sessions", () => {
  const ALPHA = focused("alpha", 1, { phases: [phase("1"), phase("2")] });
  const BETA = focused("beta", 2);
  const sessions = [
    liveSession({ sessionId: "s1", name: "alpha execute 2", cwd: "/wt/a", status: "busy", updatedAt: new Date("2026-10-01T19:55:00Z") }),
    liveSession({ sessionId: "s2", cwd: "/wt/a/src", name: "poking around" }),
    liveSession({ sessionId: "s3", name: "repo-82", cwd: "/repo" }),
    liveSession({ sessionId: "s4", name: "beta execute 1", cwd: "/elsewhere" }),
  ];
  const board = focusOf([ALPHA, BETA], {
    sessions: { ok: true, value: sessions },
    workspaces: [workspaceView("/repo", [], { isMain: true }), workspaceView("/wt/a", [ALPHA])],
    worktreePaths: ["/repo", "/wt/a"],
  });

  test("a row lists its attributed sessions, with the launch title's sub-command and phase", () => {
    expect(board.lanes.focus[0]?.sessions).toEqual([
      { label: "alpha execute 2", sub: "execute", phase: "2", status: "busy", since: "2026-10-01T19:55:00.000Z" },
      { label: "poking around", status: "idle", since: "2026-10-01T20:00:00.000Z" },
    ]);
    expect(board.lanes.focus[1]?.sessions).toEqual([]);
  });

  test("other sessions are this repo's sessions on no row; another repo's never show", () => {
    expect(board.footer.otherSessions).toEqual([{ label: "repo-82", status: "idle", since: "2026-10-01T20:00:00.000Z" }]);
  });

  test("unreadable sessions leave rows without sessions and no other sessions", () => {
    const blind = focusOf([ALPHA], { sessions: { ok: false, reason: "no dir" }, worktreePaths: ["/repo"] });
    expect(blind.lanes.focus[0]?.sessions).toEqual([]);
    expect(blind.footer).not.toHaveProperty("otherSessions");
  });
});

describe("ready rows and focus", () => {
  test("a focus spec's ready rows carry its lane position and rank first", () => {
    const board = focusOf([specFixture("urgent", { phases: [phase("1")], meta: { priority: "p1" } }), focused("second", 30), focused("first", 10)]);
    expect(board.lanes.ready.map((row) => [row.spec, row.focus])).toEqual([
      ["first", 1],
      ["second", 2],
      ["urgent", undefined],
    ]);
  });
});
