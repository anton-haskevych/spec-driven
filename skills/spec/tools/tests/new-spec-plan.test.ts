import { describe, expect, test } from "bun:test";
import { newSpecPlan } from "../commands/join";
import { prDocPath } from "../plan/kinds";
import { viewOf } from "./fake-record";
import { cardDoc, phaseDoc, prDoc, specDoc } from "./record-factories";

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

  test("the spec's card lands in the same batch, unless a card already covers it", () => {
    const phases = [phaseDoc({ id: "1", pr: "A" })];
    const card = { title: "Checkout", priority: "p2" as const };
    const planned = newSpecPlan({ spec: specDoc({ phases: ["1"] }), phases, card }, "join", () => {})(viewOf({}));
    if (!("ops" in planned)) throw new Error("expected ops");
    expect(planned.ops.slice(-2).map((op) => op.path)).toEqual(["cards/0/c1.json", "sources/c1/a.json"]);
    const covered = newSpecPlan({ spec: specDoc({ phases: ["1"] }), phases, card }, "join", () => {})(viewOf({ "cards/0/c1.json": cardDoc({ id: "c1", coveredBy: ["checkout"] }) }));
    if (!("ops" in covered)) throw new Error("expected ops");
    expect(covered.ops.some((op) => op.path.startsWith("cards/"))).toBe(false);
  });
});
