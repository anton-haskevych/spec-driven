import { describe, expect, test } from "bun:test";
import { needsYou, prAttention } from "../board/attention";
import { boardInputs, flightRow, NOW } from "./board-factories";
import { heldClaim, liveSession } from "./factories";

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

  test("a PR being babysat asks nothing of you", () => {
    expect(prAttention([flightRow({ next: "babysitting", pr: { number: 7, listed: true, passing: 1, babysitting: true } })])).toEqual([]);
  });

  test("two rows on one PR list it once", () => {
    const pr = { number: 7, listed: true, failing: 0, pending: 0, passing: 1 };
    expect(prAttention([flightRow({ phase: "1", next: "merge", pr }), flightRow({ phase: "2", next: "merge", pr })])).toEqual([{ kind: "merge", spec: "alpha", phase: "1", pr: 7 }]);
  });
});

describe("needsYou: merged trees", () => {
  test("merged trees become one prune row, last; none → no row", () => {
    const inputs = (merged: number) => boardInputs([], { counts: { merged, unknownBase: 0, unreadable: 0, duplicates: [] } });
    expect(needsYou([], inputs(43), NOW, [])).toEqual([{ kind: "prune", trees: 43 }]);
    expect(needsYou([], inputs(0), NOW, [])).toEqual([]);
  });
});

describe("needsYou: idle claims", () => {
  const quiet = new Date("2026-09-28T20:00:00Z");
  const inputs = boardInputs([], {
    sessions: { ok: true, value: [liveSession({ sessionId: "a", name: "tab a", updatedAt: quiet }), liveSession({ sessionId: "b", updatedAt: quiet })] },
    claims: [
      heldClaim("live", { sessionId: "a", spec: "alpha", phase: "2" }),
      heldClaim("live", { sessionId: "a", spec: "beta", phase: "1" }),
      heldClaim("live", { sessionId: "a", spec: "alpha", phase: "4a" }),
      heldClaim("live", { sessionId: "b", spec: "alpha", phase: "5" }),
    ],
  });
  const shown = [flightRow({ phase: "2" }), flightRow({ spec: "beta", phase: "1" }), flightRow({ phase: "4a" }), flightRow({ phase: "5" })];

  test("one row per session and spec, phases in claim order; an unnamed session shows its short id", () => {
    expect(needsYou([], inputs, NOW, shown).filter((row) => row.kind === "idle-claim")).toEqual([
      { kind: "idle-claim", spec: "alpha", phases: ["2", "4a"], session: "tab a", since: quiet.toISOString() },
      { kind: "idle-claim", spec: "beta", phases: ["1"], session: "tab a", since: quiet.toISOString() },
      { kind: "idle-claim", spec: "alpha", phases: ["5"], session: "session b", since: quiet.toISOString() },
    ]);
  });

  test("--local reads no sessions, so nothing is idle", () => {
    expect(needsYou([], { ...inputs, sessions: "local" }, NOW, shown)).toEqual([]);
  });
});
