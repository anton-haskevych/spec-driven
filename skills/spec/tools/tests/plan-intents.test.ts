import { describe, expect, test } from "bun:test";
import { PLAN_INTENTS, planIntentRunner, type PlanCommand } from "../plan/plan-intents";
import { viewOf } from "./fake-record";

const SAMPLES: Record<PlanCommand, object> = {
  add: { spec: "s", title: "T", edges: { needs: ["1"], pr: "B", code: false }, tasks: ["x"] },
  split: { spec: "s", id: "3", titles: ["Rest"], items: [[1, 2]] },
  move: { spec: "s", tasks: ["3.1"], to: "4", from: "3" },
  task: { spec: "s", phase: "3", action: "edit", task: "3.1", text: "x" },
  set: { spec: "s", phase: "3", fields: { needs: [], needsDeployed: ["1"], sameFilesAs: [], pr: null, gate: "design", title: "T", outcome: "" } },
  deployed: { spec: "s", phase: "1", day: "2026-11-12" },
  park: { spec: "s", phase: "1", question: "Q?", recommend: "no", at: "T1" },
  unpark: { spec: "s", phase: "1", answer: "A", at: "T2" },
};

describe("plan intents", () => {
  test("each command's queued args read back as they were written", () => {
    for (const [command, args] of Object.entries(SAMPLES) as [PlanCommand, object][]) {
      expect(PLAN_INTENTS[command].read(JSON.parse(JSON.stringify(args)))).toEqual(args as never);
    }
  });

  test("a malformed entry plans a refusal to drop, never a guess", () => {
    expect(PLAN_INTENTS.set.read({ spec: "s", phase: "3", fields: { gate: "legal" } })).toBeUndefined();
    expect(PLAN_INTENTS.split.read({ spec: "s", id: "3", titles: ["x"], items: [[0]] })).toBeUndefined();
    expect(planIntentRunner("add")("nonsense")(viewOf({}))).toEqual({ refused: "this queued change can't be read; drop it" });
  });

  test("a readable intent for a spec not on the board refuses", () => {
    expect(planIntentRunner("move")(SAMPLES.move)(viewOf({}))).toEqual({ refused: "s is not on the board" });
  });
});
