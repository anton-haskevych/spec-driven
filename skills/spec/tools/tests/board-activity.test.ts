import { describe, expect, test } from "bun:test";
import { phaseActivity } from "../board/activity";
import type { PhaseState } from "../core/spec-state";
import { specFixture, workspaceView } from "./board-factories";
import { phaseState } from "./factories";

const phase = (id: string, checked: number, done = false): PhaseState =>
  phaseState({ id, done, summary: { deliverables: { checked, unchecked: 3 - checked }, nextRun: [] } });
const alpha = (...phases: PhaseState[]) => specFixture("alpha", { phases });
const baseStates = (...fixtures: ReturnType<typeof alpha>[]) => new Map(fixtures.map((fixture) => [fixture.node.spec.name, fixture.state]));

const BASE = baseStates(alpha(phase("1", 3, true), phase("2", 1), phase("3", 0)));

describe("phaseActivity", () => {
  test("a phase ticked on a branch but not on base is ticked there", () => {
    const activity = phaseActivity(BASE, [workspaceView("/wt/a", [alpha(phase("1", 3, true), phase("2", 3, true), phase("3", 0))])]);
    expect([...activity]).toEqual([["alpha#2", { tickedIn: ["/wt/a"], wipIn: [] }]]);
  });

  test("a phase with more sub-items ticked than on base is work in progress there", () => {
    const activity = phaseActivity(BASE, [workspaceView("/wt/a", [alpha(phase("1", 3, true), phase("2", 1), phase("3", 2))])]);
    expect([...activity]).toEqual([["alpha#3", { tickedIn: [], wipIn: ["/wt/a"] }]]);
  });

  test("the main checkout's uncommitted edits count like any workspace's", () => {
    const main = workspaceView("/repo", [alpha(phase("1", 3, true), phase("2", 2), phase("3", 0))], { isMain: true, branch: "main" });
    expect(phaseActivity(BASE, [main]).get("alpha#2")).toEqual({ tickedIn: [], wipIn: ["/repo"] });
  });

  test("the same phase ticked in two worktrees lists both, in workspace order", () => {
    const ticked = alpha(phase("1", 3, true), phase("2", 3, true), phase("3", 0));
    expect(phaseActivity(BASE, [workspaceView("/wt/a", [ticked]), workspaceView("/wt/b", [ticked])]).get("alpha#2")).toEqual({
      tickedIn: ["/wt/a", "/wt/b"],
      wipIn: [],
    });
  });

  test("a phase done on base, or unchanged from base, has no activity", () => {
    expect(phaseActivity(BASE, [workspaceView("/wt/a", [alpha(phase("1", 3, true), phase("2", 1), phase("3", 0))])]).size).toBe(0);
  });

  test("a phase that exists only on the branch counts against an empty base", () => {
    const branch = alpha(phase("1", 3, true), phase("2", 1), phase("3", 0), phase("4", 3, true));
    expect(phaseActivity(BASE, [workspaceView("/wt/a", [branch])]).get("alpha#4")).toEqual({ tickedIn: ["/wt/a"], wipIn: [] });
  });

  test("a spec only on branches takes the first workspace's state as its base", () => {
    const fresh = (...phases: PhaseState[]) => specFixture("fresh", { phases });
    const first = workspaceView("/wt/a", [fresh(phase("1", 3, true), phase("2", 0))], { branchOnly: true });
    const second = workspaceView("/wt/b", [fresh(phase("1", 3, true), phase("2", 3, true))], { branchOnly: true });
    expect([...phaseActivity(BASE, [first, second])]).toEqual([["fresh#2", { tickedIn: ["/wt/b"], wipIn: [] }]]);
  });
});
