import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { BOARD_VERSION } from "../board/model";
import { phaseEdges, phaseState } from "./factories";
import { baseRef, boardInputs, NOW, specFixture } from "./board-factories";

const done = (id: string, overrides = {}) => phaseState({ id, name: `P${id}`, done: true, edges: phaseEdges({ declared: true }), ...overrides });
const open = (id: string, needs: string[] = [], overrides = {}) =>
  phaseState({ id, name: `P${id}`, edges: phaseEdges({ declared: true, needs }), ...overrides });

describe("buildBoard", () => {
  test("puts every open phase in ready or blocked, with readySet's reasons", () => {
    const alpha = specFixture("alpha", { phases: [done("1"), open("2", ["1"]), open("3", ["2"])] });
    const board = buildBoard(boardInputs([alpha]), NOW);

    expect(board.lanes.ready.map((row) => [row.spec, row.phase, row.next])).toEqual([["alpha", "2", "execute"]]);
    expect(board.lanes.ready[0]?.target).toEqual({ newWorktree: "alpha-2" });
    expect(board.lanes.blocked).toEqual([{ spec: "alpha", phase: "3", reasons: ["needs 2"] }]);
    expect(board.lanes.inFlight).toEqual([]);
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
