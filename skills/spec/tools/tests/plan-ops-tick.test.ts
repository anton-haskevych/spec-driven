import { describe, expect, test } from "bun:test";
import { phaseDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { readTickIntent, tickPlan, type TickIntent, type TickSeen } from "../plan/ops/tick";
import { planWrites } from "../record/plan-writes";
import type { RecordView } from "../record/view";
import { viewOf } from "./fake-record";
import { phaseDoc, specDoc, task } from "./record-factories";

const SHA = "0651e4e8f14deab768d420d9dd09b78042b0d2fb";
const AT = "2026-11-12T10:04:00.000Z";

function record(tasks = [task({ id: "2.3", text: "three" }), task({ id: "2.4", text: "four" })]): RecordView {
  return viewOf({
    [specDocPath("checkout")]: specDoc({ phases: ["2", "3"] }),
    [phaseDocPath("checkout", "2")]: phaseDoc({ id: "2", tasks }),
    [phaseDocPath("checkout", "3")]: phaseDoc({ id: "3", tasks: [task({ id: "3.1", text: "moved here" })] }),
  });
}

function intent(overrides: Partial<TickIntent> = {}): TickIntent {
  return { spec: "checkout", phase: "2", task: "2.3", evidence: `${SHA} on origin/feat/checkout-pr-a`, at: AT, session: "s-1", tree: "checkout-pr-a", ...overrides };
}

function tasksAfter(view: RecordView, plan: ReturnType<typeof tickPlan>, phase = "2") {
  const planned = plan(view);
  if (!("ops" in planned)) throw new Error(JSON.stringify(planned));
  const written = planWrites(view, planned.ops, validateRecordDoc);
  if (written.kind !== "planned") throw new Error(JSON.stringify(written));
  const text = written.changes.find((change) => change.path === phaseDocPath("checkout", phase))?.text ?? "";
  return (JSON.parse(text) as { tasks: unknown[] }).tasks;
}

describe("tickPlan", () => {
  test("sets one task done with its evidence, who and when, and leaves the others alone", () => {
    const seen: TickSeen[] = [];
    expect(tasksAfter(record(), tickPlan(intent(), (s) => seen.push(s)))).toEqual([
      { id: "2.3", text: "three", done: true, evidence: `${SHA} on origin/feat/checkout-pr-a`, doneAt: AT, doneBy: "s-1", doneIn: "checkout-pr-a" },
      { id: "2.4", text: "four", done: false },
    ]);
    expect(seen).toEqual([{ kind: "ticked", phase: "2", task: "2.3", phaseComplete: false }]);
  });

  test("says the phase is complete when the last task closes", () => {
    const seen: TickSeen[] = [];
    tasksAfter(record([task({ id: "2.3", text: "three" })]), tickPlan(intent(), (s) => seen.push(s)));
    expect(seen.at(-1)).toMatchObject({ phaseComplete: true });
  });

  test("a queued tick is marked unpushed until it is sent", () => {
    expect(tasksAfter(record(), tickPlan(intent({ unpushed: true })))[0]).toMatchObject({ done: true, unpushed: true });
  });

  test("finds a task that moved to another phase by its id", () => {
    const seen: TickSeen[] = [];
    expect(tasksAfter(record(), tickPlan(intent({ task: "3.1" }), (s) => seen.push(s)), "3")[0]).toMatchObject({ id: "3.1", done: true });
    expect(seen).toEqual([{ kind: "ticked", phase: "3", task: "3.1", phaseComplete: true }]);
  });

  test("refuses a task closed by another session, saying who and when", () => {
    const closed = task({ id: "2.3", text: "three", done: true, evidence: `${SHA} on origin/feat/checkout-pr-b`, doneAt: "2026-11-12T10:00:00.000Z", doneBy: "s-2", doneIn: "checkout-pr-b" });
    expect(tickPlan(intent())(record([closed]))).toEqual({ refused: "2.3 was closed 4m ago by the session in tree checkout-pr-b (0651e4e)" });
  });

  test("a task closed at join names its commit only", () => {
    expect(tickPlan(intent())(record([task({ id: "2.3", text: "three", done: true, evidence: SHA })]))).toEqual({ refused: "2.3 was already closed (0651e4e)" });
  });

  test("a repeat by the same session changes nothing and reports what it closed", () => {
    const seen: TickSeen[] = [];
    const mine = task({ id: "2.3", text: "three", done: true, evidence: SHA, doneBy: "s-1", doneIn: "checkout-pr-a" });
    expect(tickPlan(intent(), (s) => seen.push(s))(record([mine]))).toEqual({ unchanged: true });
    expect(seen).toEqual([{ kind: "already", phase: "2", task: mine }]);
  });

  test("refuses an unknown task or a spec not on the board", () => {
    expect(tickPlan(intent({ task: "9.9" }))(record())).toEqual({ refused: "no task 9.9 in checkout" });
    expect(tickPlan(intent({ spec: "ghost" }))(record())).toEqual({ refused: "ghost is not on the board" });
  });
});

describe("readTickIntent", () => {
  test("reads back what a tick queued, and nothing else", () => {
    expect(readTickIntent(JSON.parse(JSON.stringify(intent({ unpushed: true }))))).toEqual(intent({ unpushed: true }));
    expect(readTickIntent({ ...intent(), task: 3 })).toBeUndefined();
    expect(readTickIntent("tick")).toBeUndefined();
  });
});
