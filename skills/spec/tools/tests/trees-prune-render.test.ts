import { describe, expect, test } from "bun:test";
import { renderPruneSummaryLine } from "../trees/prune-render";

describe("prune summary line", () => {
  test("names at most ten trees, then counts the rest", () => {
    const outcomes = Array.from({ length: 12 }, (_, index) => ({ path: `/trees/t${index + 1}`, branch: `feat/t${index + 1}` }));
    expect(renderPruneSummaryLine(outcomes, { candidates: [], strays: [] })).toBe("Pruned 12 merged trees (t1, t2, t3, t4, t5, t6, t7, t8, t9, t10 +2 more)");
  });

  test("a removed tree whose branch git kept is counted apart", () => {
    const outcomes = [{ path: "/trees/a", branch: "feat/a", branchKept: "checked out elsewhere" }];
    expect(renderPruneSummaryLine(outcomes, { candidates: [], strays: [], prsUnchecked: "gh: not logged in" })).toBe("Pruned 1 merged tree (a) · 1 branch kept (feat/a) · PR merges not checked (gh: not logged in)");
  });
});
