import { describe, expect, test } from "bun:test";
import { joinedActivity } from "../board/joined-activity";
import { phaseDoc, prDoc, specDoc, task } from "./record-factories";

const SHA = "0651e4e0651e4e0651e4e0651e4e0651e4e0651e";
const trees = [
  { path: "/trees/pr-a", branch: "feat/alpha-pr-a" },
  { path: "/trees/pr-b", branch: "feat/alpha-pr-b" },
];
const plan = (...phases: ReturnType<typeof phaseDoc>[]) => ({ spec: specDoc({ name: "alpha", phases: phases.map((phase) => phase.id) }), phases });

describe("joinedActivity", () => {
  test("a task done on origin/<branch> puts its open phase in progress in that branch's tree", () => {
    const phase = phaseDoc({ id: "2", tasks: [task({ id: "2.1", done: true, evidence: `${SHA} on origin/feat/alpha-pr-b` }), task({ id: "2.2" })] });
    expect(joinedActivity([plan(phase)], trees)).toEqual(new Map([["alpha#2", { tickedIn: [], wipIn: ["/trees/pr-b"] }]]));
  });

  test("a finished phase, evidence without a branch, and a branch with no tree add nothing", () => {
    const finished = phaseDoc({ id: "1", tasks: [task({ id: "1.1", done: true, evidence: `${SHA} on origin/feat/alpha-pr-a` })] });
    const noBranch = phaseDoc({ id: "2", tasks: [task({ id: "2.1", done: true, evidence: SHA }), task({ id: "2.2" })] });
    const noTree = phaseDoc({ id: "3", tasks: [task({ id: "3.1", done: true, evidence: `${SHA} on origin/feat/gone` }), task({ id: "3.2" })] });
    expect(joinedActivity([plan(finished, noBranch, noTree)], trees)).toEqual(new Map());
  });

  test("two tasks from the same tree name it once", () => {
    const phase = phaseDoc({ id: "2", tasks: [
      task({ id: "2.1", done: true, evidence: `${SHA} on origin/feat/alpha-pr-a` }),
      task({ id: "2.2", done: true, evidence: `${SHA} on origin/feat/alpha-pr-a` }),
      task({ id: "2.3" }),
    ] });
    expect(joinedActivity([plan(phase)], trees).get("alpha#2")?.wipIn).toEqual(["/trees/pr-a"]);
  });

  describe("a built phase (every task done)", () => {
    const built = phaseDoc({ id: "2", pr: "A", tasks: [task({ id: "2.1", done: true, evidence: `${SHA} on origin/feat/alpha-pr-a` })] });
    const docs = (doc: ReturnType<typeof prDoc>) => () => [doc];

    test("with its PR not opened, stays in flight in its group's tree and asks for the PR", () => {
      expect(joinedActivity([plan(built)], trees, docs(prDoc({ group: "A", branch: "feat/alpha-pr-a" }))).get("alpha#2")).toEqual({ tickedIn: ["/trees/pr-a"], wipIn: [], built: { prGroup: "A", prNotOpened: true } });
    });

    test("with its PR open, stays in flight until the PR merges", () => {
      const open = prDoc({ group: "A", branch: "feat/alpha-pr-a", number: 9, state: "green" });
      expect(joinedActivity([plan(built)], trees, docs(open)).get("alpha#2")?.built).toEqual({ prGroup: "A", prNotOpened: false });
      expect(joinedActivity([plan(built)], trees, docs({ ...open, state: "merged" })).size).toBe(0);
    });

    test("finished at join (bare sha, nothing opened) is history, not in flight", () => {
      const atJoin = phaseDoc({ id: "2", pr: "A", tasks: [task({ id: "2.1", done: true, evidence: SHA })] });
      expect(joinedActivity([plan(atJoin)], trees, docs(prDoc({ group: "A", branch: "feat/alpha-pr-a" }))).size).toBe(0);
    });
  });
});
