import { describe, expect, test } from "bun:test";
import { boardLine } from "../context/board-lines";
import { INTENT_PLANNERS } from "../plan/intents";
import { phaseDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { readJoinedPlan } from "../plan/state-source";
import { overlayIntents } from "../record/overlay";
import { viewOf } from "./fake-record";
import { phaseDoc, specDoc, task } from "./record-factories";

const view = viewOf({
  [specDocPath("checkout")]: specDoc({ phases: ["2"] }),
  [phaseDocPath("checkout", "2")]: phaseDoc({ id: "2", tasks: [task({ id: "2.3", text: "three" }), task({ id: "2.4", text: "four" })] }),
});
const tick = (taskId: string) => ({
  session: "s1",
  command: "tick",
  args: { spec: "checkout", phase: "2", task: taskId, evidence: "0651e4e8f14deab768d420d9dd09b78042b0d2fb on origin/feat/x", at: "2026-11-12T10:00:00Z", tree: "x", session: "s1", unpushed: true },
});

describe("overlayIntents", () => {
  test("lays queued ticks over the record in order, so reads show them done", () => {
    const tasks = readJoinedPlan(overlayIntents(view, [tick("2.3"), tick("2.4")], INTENT_PLANNERS, validateRecordDoc), "checkout")?.phases[0]?.tasks;
    expect(tasks?.map((each) => [each.id, each.done, each.unpushed])).toEqual([["2.3", true, true], ["2.4", true, true]]);
  });

  test("skips what no longer plans or has no planner, and leaves the record as it was", () => {
    const overlaid = overlayIntents(view, [tick("9.9"), { session: "s1", command: "card", args: {} }], INTENT_PLANNERS, validateRecordDoc);
    expect(readJoinedPlan(overlaid, "checkout")).toEqual(readJoinedPlan(view, "checkout"));
  });
});

describe("boardLine", () => {
  test("counts the changes not shared yet", () => {
    const joined = readJoinedPlan(view, "checkout");
    expect(boardLine({ kind: "read", view, live: false, ageMs: 60_000, offline: "unreachable" }, joined, 2)).toBe("Board: local copy from 1m ago (origin unreachable) · plan v1 · 2 changes not shared yet");
  });
});
