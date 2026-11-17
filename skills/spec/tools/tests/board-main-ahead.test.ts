import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { MAIN_AHEAD_MINUTES, mainAhead, mainAheadRows } from "../board/main-ahead";
import { renderBoard } from "../board/render";
import type { Git } from "../core/git";
import type { RunResult } from "../core/run";
import { needRows, type NeedOwners } from "../page/needs";
import { boardInputs, NOW } from "./board-factories";

const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();
const ahead = (minutes: number) => ({ branch: "main", commits: 4, since: minutesAgo(minutes) });
const BASE = { branch: "main", sha: "abc123" };

function gitAnswering(stdout: string, code = 0): Git & { asked: string[][] } {
  const asked: string[][] = [];
  const run = (args: readonly string[]): RunResult => {
    asked.push([...args]);
    return { code, stdout, stderr: code === 0 ? "" : "fatal: bad revision" };
  };
  return {
    asked,
    run,
    out: (args) => {
      const result = run(args);
      return result.code === 0 ? { ok: true, value: result.stdout.trim() } : { ok: false, reason: result.stderr };
    },
  };
}

describe("mainAhead", () => {
  test("counts the local default branch's commits past origin's tip, oldest commit's date as since", () => {
    const git = gitAnswering("2026-10-01T19:00:00Z\n2026-10-01T18:00:00Z\n");
    expect(mainAhead(git, BASE)).toEqual({ branch: "main", commits: 2, since: "2026-10-01T18:00:00Z" });
    expect(git.asked).toEqual([["log", "--format=%cI", "abc123..refs/heads/main"]]);
  });

  test("nothing ahead, or no local default branch, is no value", () => {
    expect(mainAhead(gitAnswering(""), BASE)).toBeUndefined();
    expect(mainAhead(gitAnswering("", 128), BASE)).toBeUndefined();
  });
});

describe("mainAheadRows", () => {
  test("is a row once the oldest unpublished commit is past the grace", () => {
    expect(mainAheadRows(boardInputs([], { mainAhead: ahead(MAIN_AHEAD_MINUTES + 1) }), NOW)).toEqual([{ kind: "main-ahead", ...ahead(MAIN_AHEAD_MINUTES + 1) }]);
  });

  test("a commit a session is about to publish, or none at all, is not", () => {
    expect(mainAheadRows(boardInputs([], { mainAhead: ahead(5) }), NOW)).toEqual([]);
    expect(mainAheadRows(boardInputs([]), NOW)).toEqual([]);
  });
});

test("the board puts it first under needs you, in words", () => {
  const board = buildBoard(boardInputs([], { mainAhead: ahead(180) }), NOW);
  expect(board.lanes.needsYou[0]).toMatchObject({ kind: "main-ahead", commits: 4 });
  expect(renderBoard(board)).toContain("main has 4 commits not on origin");
  expect(renderBoard(board)).toContain("since 3h ago → push them (spec.ts push, in the main checkout)");
});

test("the page ranks it above questions and PRs, as everyone's row", () => {
  const owners: NeedOwners = { specOwner: () => undefined, cardAssignee: () => undefined, cardAsking: () => undefined, now: NOW };
  const lanes = { needsYou: [{ kind: "merge" as const, spec: "a", pr: 7 }, { kind: "main-ahead" as const, ...ahead(180) }] };
  const needs = needRows({ lanes: { ...buildBoard(boardInputs([]), NOW).lanes, ...lanes }, me: "anton" }, [], owners);
  expect(needs.rows.map((row) => row.kind)).toEqual(["main-ahead", "merge"]);
  expect(needs.rows[0]).toMatchObject({ mark: "M", late: true });
  expect(needs.mine).toBe(2);
});
