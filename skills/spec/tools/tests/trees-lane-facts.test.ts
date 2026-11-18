import { describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import type { RunResult } from "../core/run";
import { laneTreeFacts } from "../trees/lane-facts";
import type { LaneInfo } from "../trees/prune-rules";
import { strictRunner } from "./stub-runner";

const LANE: LaneInfo = { spec: "x", specBranch: "feat/x", laneOpen: false };
const ANCESTOR = ["git", "merge-base", "--is-ancestor", "origin/feat/x-pr-b", "origin/feat/x"];
const BEYOND = ["git", "log", "--no-merges", "--format=", "--name-only", "-z", "h1", "^origin/feat/x-pr-b", "^origin/main"];

function git(answers: { ancestor?: Partial<RunResult>; beyond?: Partial<RunResult> }) {
  return strictRunner([
    [ANCESTOR, answers.ancestor ?? {}],
    [BEYOND, answers.beyond ?? { stdout: "" }],
  ]);
}

const facts = (runner: ReturnType<typeof git>, lane: LaneInfo = LANE) => laneTreeFacts(gitAt("/repo", runner), { branch: "feat/x-pr-b", head: "h1" }, lane, "main");

describe("laneTreeFacts", () => {
  test("lane in feat/<spec>, nothing beyond it", () => {
    const runner = git({});
    expect(facts(runner)).toEqual({ ...LANE, inSpecBranch: true, onlySpecDocsBeyond: true });
    expect(runner.calls).toEqual([ANCESTOR, BEYOND]);
  });

  test("spec-doc commits beyond (nested spec roots too, non-ASCII raw under -z): only spec docs", () => {
    const beyond = { stdout: "docs/specs/x/progress.md\0app/docs/specs/café/CLAUDE.md\0\0docs/specs/x/in-flight/phase-4.md\0" };
    expect(facts(git({ beyond })).onlySpecDocsBeyond).toBe(true);
  });

  test("a code commit beyond, or a log that fails: not only spec docs; a lane outside feat/<spec>: not in it", () => {
    expect(facts(git({ beyond: { stdout: "docs/specs/x/progress.md\0skills/spec/tools/x.ts\0" } })).onlySpecDocsBeyond).toBe(false);
    expect(facts(git({ beyond: { code: 128, stderr: "fatal: bad revision" } })).onlySpecDocsBeyond).toBe(false);
    expect(facts(git({ ancestor: { code: 1 } })).inSpecBranch).toBe(false);
  });

  test("out of the mode no spec branch is asked about", () => {
    const runner = git({});
    const merged: LaneInfo = { spec: "x", laneOpen: false, mergedPr: 31 };
    expect(facts(runner, merged)).toEqual({ ...merged, inSpecBranch: false, onlySpecDocsBeyond: true });
    expect(runner.calls).toEqual([BEYOND]);
  });
});
