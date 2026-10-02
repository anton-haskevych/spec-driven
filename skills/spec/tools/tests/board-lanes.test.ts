import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { BOARD_VERSION } from "../board/model";
import { phaseEdges, phaseState } from "./factories";
import { baseRef, boardInputs, NOW, specFixture, workspaceView } from "./board-factories";

const done = (id: string, overrides = {}) => phaseState({ id, name: `P${id}`, done: true, edges: phaseEdges({ declared: true }), ...overrides });
const open = (id: string, needs: string[] = [], overrides = {}) =>
  phaseState({ id, name: `P${id}`, edges: phaseEdges({ declared: true, needs }), ...overrides });

describe("buildBoard", () => {
  test("puts every open phase in ready or blocked, with readySet's reasons", () => {
    const alpha = specFixture("alpha", { phases: [done("1"), open("2", ["1"]), open("3", ["2"])] });
    const board = buildBoard(boardInputs([alpha]), NOW);

    expect(board.lanes.ready.map((row) => [row.spec, row.phase, row.next])).toEqual([["alpha", "2", "execute"]]);
    expect(board.lanes.ready[0]?.target).toEqual({ newWorktree: "alpha" });
    expect(board.lanes.blocked).toEqual([{ spec: "alpha", phase: "3", reasons: ["needs 2"] }]);
    expect(board.lanes.inFlight).toEqual([]);
  });

  test("every ready phase of one PR group targets the group's one tree", () => {
    const grouped = (id: string) => open(id, [], { edges: phaseEdges({ declared: true, pr: "A" }) });
    const board = buildBoard(boardInputs([specFixture("academy", { phases: [grouped("2"), grouped("8"), grouped("9")] })]), NOW);
    expect(board.lanes.ready.map((row) => row.target)).toEqual([{ newWorktree: "academy-pr-a" }, { newWorktree: "academy-pr-a" }, { newWorktree: "academy-pr-a" }]);
  });

  test("an existing group tree is the target; a busy one loses ★ and says who to wait for", () => {
    const grouped = (id: string, overrides = {}) => open(id, [], { edges: phaseEdges({ declared: true, pr: "B" }), ...overrides });
    const alpha = specFixture("alpha", { phases: [grouped("4"), grouped("5")] });
    const tree = workspaceView("/trees/alpha-pr-b", [], { branch: "feat/alpha-pr-b" });
    const free = buildBoard(boardInputs([alpha], { workspaces: [tree] }), NOW);
    expect(free.lanes.ready.map((row) => [row.phase, row.target, row.safe])).toEqual([["4", { workspace: "/trees/alpha-pr-b" }, true], ["5", { workspace: "/trees/alpha-pr-b" }, true]]);

    const claim = { spec: "alpha", phase: "4", sessionId: "s1", sessionName: "alpha execute 4", workspace: "/trees/alpha-pr-b", claimedAt: NOW.toISOString() };
    const busy = buildBoard(boardInputs([alpha], { workspaces: [tree], claims: [{ claim, status: "live" }] }), NOW);
    expect(busy.lanes.ready.map((row) => [row.phase, row.safe, row.treeBusy])).toEqual([["5", false, "after alpha 4 (alpha execute 4)"]]);
  });

  test("the caller's own claim, even read as unknown under --local, and an idle tab don't make a tree busy", () => {
    const grouped = (id: string) => open(id, [], { edges: phaseEdges({ declared: true, pr: "B" }) });
    const alpha = specFixture("alpha", { phases: [grouped("4"), grouped("5")] });
    const tree = workspaceView("/trees/alpha-pr-b", [], { branch: "feat/alpha-pr-b" });
    const claim = { spec: "alpha", phase: "4", sessionId: "me", sessionName: "alpha execute 4", workspace: "/trees/alpha-pr-b", claimedAt: NOW.toISOString() };
    const own = buildBoard(boardInputs([alpha], { workspaces: [tree], claims: [{ claim, status: "unknown" }], ownSessionId: "me" }), NOW);
    expect(own.lanes.ready.map((row) => [row.phase, row.treeBusy])).toEqual([["5", undefined]]);

    const tab = (status: "busy" | "idle") => ({ pid: 1, sessionId: "other", cwd: "/trees/alpha-pr-b", status, name: "alpha execute 3", updatedAt: NOW, procStart: "x" });
    const withTab = (status: "busy" | "idle") => buildBoard(boardInputs([alpha], { workspaces: [tree], sessions: { ok: true, value: [tab(status)] }, ownSessionId: "me" }), NOW);
    expect(withTab("idle").lanes.ready.map((row) => row.treeBusy)).toEqual([undefined, undefined]);
    expect(withTab("busy").lanes.ready.map((row) => row.treeBusy)).toEqual(["alpha execute 3 is mid-task there", "alpha execute 3 is mid-task there"]);
  });

  test("a spec without phases is ready for prep or create, or blocked by its own needs", () => {
    const board = buildBoard(
      boardInputs([
        specFixture("alpha", { phases: [open("1")] }),
        specFixture("beta", { stage: "prep" }),
        specFixture("gamma", { stage: "create", relations: [{ type: "needs", target: "alpha" }] }),
      ]),
      NOW,
    );

    expect(board.lanes.ready.map((row) => [row.spec, row.phase, row.next, row.target])).toContainEqual(["beta", undefined, "prep", { newWorktree: "beta" }]);
    expect(board.lanes.blocked).toEqual([{ spec: "gamma", reasons: ["needs alpha"] }]);
  });

  test("finished and paused specs are left out; paused ones are counted", () => {
    const board = buildBoard(
      boardInputs(
        [
          specFixture("closed", { status: "done", phases: [open("1")] }),
          specFixture("shipped", { phases: [done("1")] }),
          specFixture("held", { status: "paused", phases: [open("1")] }),
        ],
        { backlogCount: 4, counts: { merged: 0, unknownBase: 0, unreadable: 0, duplicates: ["twin"] } },
      ),
      NOW,
    );

    expect(board.lanes.ready).toEqual([]);
    expect(board.lanes.blocked).toEqual([]);
    expect(board.footer).toEqual({ merged: 0, unknownBase: 0, unreadable: 0, paused: 1, backlog: 4, duplicates: ["twin"] });
  });

  test("needs you: overdue specs and phases, and a done phase another one waits to see deployed", () => {
    const alpha = specFixture("alpha", {
      meta: { due: "2026-09-28" },
      phases: [done("1"), open("2", [], { edges: phaseEdges({ declared: true, needsDeployed: ["1"] }), schedule: { due: "2026-09-30", problems: [] } })],
    });
    const board = buildBoard(boardInputs([alpha]), NOW);

    expect(board.lanes.needsYou).toEqual([
      { kind: "overdue", spec: "alpha", due: "2026-09-28" },
      { kind: "overdue", spec: "alpha", phase: "2", due: "2026-09-30" },
      { kind: "deploy", spec: "alpha", phase: "1", waiting: ["alpha#2"] },
    ]);
    expect(board.lanes.blocked).toEqual([{ spec: "alpha", phase: "2", reasons: ["needs deployed 1"] }]);
  });

  test("the header says how fresh the base is", () => {
    const modeOf = (fetch: Parameters<typeof baseRef>[0]) => buildBoard(boardInputs([], { base: baseRef(fetch) }), NOW).base;

    expect(modeOf({})).toEqual({ branch: "main", sha: "e43d948", date: "2026-10-01T13:40:00-07:00", mode: "fetched" });
    expect(modeOf({ fetch: "local" }).mode).toBe("local");
    expect(modeOf({ fetch: { ok: false, reason: "git fetch failed: cannot lock ref 'refs/remotes/origin/main'" } })).toMatchObject({ mode: "busy" });
    expect(modeOf({ fetch: { ok: false, reason: "git fetch failed: timed out after 10000 ms" } })).toMatchObject({
      mode: "offline",
      reason: "git fetch failed: timed out after 10000 ms",
    });
  });

  test("is versioned and stamped with the time it was built", () => {
    const board = buildBoard(boardInputs([]), NOW);
    expect(board.version).toBe(BOARD_VERSION);
    expect(board.generatedAt).toBe("2026-10-01T20:00:00.000Z");
    expect(JSON.parse(JSON.stringify(board))).toEqual(board);
  });
});
