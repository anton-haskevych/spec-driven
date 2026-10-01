import { describe, expect, test } from "bun:test";
import { prAttention } from "../board/attention";
import { flightRow } from "./board-factories";

describe("prAttention", () => {
  test("joined PRs to merge or fix CI become needs-you rows", () => {
    const rows = [
      flightRow({ spec: "a", phase: "4", prGroup: "B", next: "fix CI", pr: { number: 881, listed: true, failing: 2, pending: 0, passing: 9 } }),
      flightRow({ spec: "b", phase: "4", next: "merge", pr: { number: 861, listed: true, failing: 0, pending: 0, passing: 3 } }),
    ];
    expect(prAttention(rows)).toEqual([
      { kind: "fix", spec: "a", phase: "4", prGroup: "B", pr: 881, failing: 2 },
      { kind: "merge", spec: "b", phase: "4", pr: 861 },
    ]);
  });

  test("rows without a joined PR verdict add nothing", () => {
    const rows = [
      flightRow({ next: "executing", pr: { number: 1, listed: true, failing: 0, pending: 2, passing: 1 } }),
      flightRow({ next: "ticked on branch, not merged" }),
      flightRow({ pr: "unknown" }),
    ];
    expect(prAttention(rows)).toEqual([]);
  });

  test("two rows on one PR list it once", () => {
    const pr = { number: 7, listed: true, failing: 0, pending: 0, passing: 1 };
    expect(prAttention([flightRow({ phase: "1", next: "merge", pr }), flightRow({ phase: "2", next: "merge", pr })])).toEqual([{ kind: "merge", spec: "alpha", phase: "1", pr: 7 }]);
  });
});
