import { describe, expect, test } from "bun:test";
import { specDocPath, validateRecordDoc } from "../plan/kinds";
import { fieldPlan, readFieldIntent } from "../plan/ops/field";
import { planWrites } from "../record/plan-writes";
import { viewOf } from "./fake-record";
import { specDoc } from "./record-factories";

const view = (fields: object = {}) => viewOf({ [specDocPath("checkout")]: specDoc({ layout: 2, ...fields }) });

describe("fieldPlan", () => {
  test("sets a field with one patch to spec.json, and clears one with null", () => {
    const set = fieldPlan({ spec: "checkout", key: "owner", value: "Taras" })(view());
    expect(set).toEqual({ ops: [{ op: "update", path: specDocPath("checkout"), patch: { owner: "Taras" } }], message: "record: owner checkout Taras" });
    if ("ops" in set) expect(planWrites(view(), set.ops, validateRecordDoc).kind).toBe("planned");
    expect(fieldPlan({ spec: "checkout", key: "owner", value: null })(view({ owner: "Taras" }))).toMatchObject({ ops: [{ patch: { owner: null } }] });
  });

  test("a value the record already holds changes nothing", () => {
    expect(fieldPlan({ spec: "checkout", key: "ship", value: "auto" })(view({ ship: "auto" }))).toEqual({ unchanged: true });
    expect(fieldPlan({ spec: "checkout", key: "owner", value: null })(view())).toEqual({ unchanged: true });
  });

  test("focus keeps its rules on the record", () => {
    expect(fieldPlan({ spec: "checkout", key: "focus", value: "must", focus: "add" })(view({ focus: "could" }))).toEqual({ refused: "checkout is already in focus (could); use move" });
    expect(fieldPlan({ spec: "checkout", key: "focus", value: "must", focus: "move" })(view())).toEqual({ refused: "checkout is not in focus" });
    expect(fieldPlan({ spec: "checkout", key: "focus", value: null, focus: "drop" })(view())).toEqual({ refused: "checkout is not in focus" });
    expect(fieldPlan({ spec: "checkout", key: "focus", value: "must", focus: "move" })(view({ focus: "must" }))).toEqual({ refused: "checkout is already must" });
  });

  test("a spec off the board is refused", () => {
    expect(fieldPlan({ spec: "other", key: "status", value: "done" })(view())).toEqual({ refused: "other is not on the board" });
  });
});

describe("readFieldIntent", () => {
  test("reads back what was queued, and nothing malformed", () => {
    expect(readFieldIntent({ spec: "checkout", key: "status", value: "done" })).toEqual({ spec: "checkout", key: "status", value: "done" });
    expect(readFieldIntent({ spec: "checkout", key: "priority", value: "p1" })).toBeUndefined();
    expect(readFieldIntent({ spec: "checkout", key: "focus", value: 3 })).toBeUndefined();
  });
});
