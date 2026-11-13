import { describe, expect, test } from "bun:test";
import { prObservedOf, prObservedOfRow, prSeenOf } from "../plan/pr-observed";
import type { PrRow } from "../pr/checks/rollup";
import { prView } from "./pr-factories";

const row = (overrides: Partial<PrRow> = {}): PrRow => ({ number: 7, branch: "feat/checkout-pr-a", state: "OPEN", draft: false, url: "", headRefOid: "aaa111", ...overrides });

describe("prObservedOf", () => {
  test("a ready PR is green only when pr status says so", () => {
    const view = prView({ number: 7, state: "OPEN", isDraft: false, headRefName: "feat/checkout-pr-a", headRefOid: "aaa111" });
    expect(prObservedOf(view, true)).toEqual({ number: 7, branch: "feat/checkout-pr-a", state: "green", headRefOid: "aaa111" });
    expect(prObservedOf(view, false).state).toBe("open");
    expect(prObservedOf(view).state).toBe("ready");
  });

  test("a merged PR carries its merge commit; prSeenOf never says green", () => {
    const view = prView({ number: 7, state: "MERGED", headRefName: "feat/checkout-pr-a", headRefOid: "aaa111", mergeCommit: "fff999" });
    expect(prObservedOf(view, true)).toMatchObject({ state: "merged", mergedSha: "fff999" });
    expect(prSeenOf(prView({ state: "OPEN", isDraft: false })).state).toBe("open");
  });
});

describe("prObservedOfRow", () => {
  test("an open row is ready: its CI wasn't read", () => {
    expect(prObservedOfRow(row()).state).toBe("ready");
  });

  test("a merged row brings its merge commit and the day it merged", () => {
    expect(prObservedOfRow(row({ state: "MERGED", mergeCommit: "fff999", mergedAt: "2026-11-12T08:00:00Z" }))).toEqual({
      number: 7,
      branch: "feat/checkout-pr-a",
      state: "merged",
      headRefOid: "aaa111",
      mergedSha: "fff999",
      mergedAt: "2026-11-12",
    });
  });

  test("a draft row is draft", () => {
    expect(prObservedOfRow(row({ draft: true })).state).toBe("draft");
  });
});
