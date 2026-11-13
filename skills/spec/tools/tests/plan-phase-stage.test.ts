import { describe, expect, test } from "bun:test";
import { phaseStage } from "../plan/phase-stage";
import { phaseDoc, prDoc, task } from "./record-factories";

const pushed = (id: string) => task({ id, done: true, evidence: "0651e4e on origin/feat/checkout-pr-a" });
const bare = (id: string) => task({ id, done: true, evidence: "0651e4e" });
const open = (id: string) => task({ id });

describe("phaseStage", () => {
  test.each([
    ["no task done, nobody holding it", [open("1.1"), open("1.2")], undefined, false, "todo"],
    ["a session holds it", [open("1.1")], undefined, true, "doing"],
    ["a task done with a pushed commit", [pushed("1.1"), open("1.2")], undefined, false, "doing"],
    ["a ticked box with no branch (S44)", [bare("1.1"), open("1.2")], undefined, false, "todo"],
    ["every task done, PR not opened", [pushed("1.1")], prDoc(), false, "built"],
    ["every task done, PR open", [pushed("1.1")], prDoc({ number: 3, state: "open" }), false, "built"],
    ["every task done, no PR document", [pushed("1.1")], undefined, false, "built"],
    ["its PR merged", [pushed("1.1")], prDoc({ number: 3, state: "merged" }), false, "merged"],
  ] as const)("%s → %s", (_name, tasks, pr, held, expected) => {
    expect(phaseStage(phaseDoc({ tasks: [...tasks] }), pr, held)).toBe(expected);
  });

  test("deployed beats everything", () => {
    expect(phaseStage(phaseDoc({ tasks: [open("1.1")], deployed: "2026-11-12" }), undefined, true)).toBe("deployed");
  });

  test("merged comes from the PR's own state, never from its tasks alone", () => {
    expect(phaseStage(phaseDoc({ tasks: [pushed("1.1"), open("1.2")] }), prDoc({ number: 3, state: "merged" }), false)).toBe("doing");
  });

  test("a task phase is done once every task has its evidence, with no PR", () => {
    const taskPhase = (tasks: ReturnType<typeof task>[]) => phaseDoc({ code: false, tasks });
    expect(phaseStage(taskPhase([task({ id: "1.1", done: true, evidence: "https://example.com/post" })]), undefined, false)).toBe("done");
    expect(phaseStage(taskPhase([task({ id: "1.1", done: true }), open("1.2")]), undefined, false)).toBe("doing");
    expect(phaseStage(taskPhase([open("1.1")]), undefined, false)).toBe("todo");
  });
});
