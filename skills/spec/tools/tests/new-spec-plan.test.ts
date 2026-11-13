import { describe, expect, test } from "bun:test";
import { newSpecPlan } from "../commands/join";
import { prDocPath } from "../plan/kinds";
import { viewOf } from "./fake-record";
import { phaseDoc, prDoc, specDoc } from "./record-factories";

describe("newSpecPlan", () => {
  test("a joining spec gets one not-opened PR document per code group, in the same batch", () => {
    const phases = [phaseDoc({ id: "1", pr: "A" }), phaseDoc({ id: "2", pr: "B" }), phaseDoc({ id: "3", pr: "B" }), phaseDoc({ id: "4", code: false, tasks: [] })];
    const planned = newSpecPlan({ spec: specDoc({ phases: ["1", "2", "3", "4"] }), phases }, "join", () => {})(viewOf({}));
    if (!("ops" in planned)) throw new Error("expected ops");
    expect(planned.ops.filter((op) => op.path.includes("/prs/"))).toEqual([
      { op: "create", path: prDocPath("checkout", "A"), doc: prDoc({ group: "A" }) },
      { op: "create", path: prDocPath("checkout", "B"), doc: prDoc({ group: "B" }) },
    ]);
  });
});
