import { describe, expect, test } from "bun:test";
import { comparePhaseIds, phaseInRange } from "../core/phase-title";

describe("comparePhaseIds", () => {
  test("orders dotted parts numerically and letter suffixes after their number", () => {
    const ids = ["8", "9.10", "7b", "9.9", "7", "7a", "2b-pre", "2b", "10", "7aa"];
    expect(ids.sort((a, b) => comparePhaseIds(a, b) ?? 0)).toEqual(["2b", "2b-pre", "7", "7a", "7b", "7aa", "8", "9.9", "9.10", "10"]);
  });

  test("ignores case and treats equal ids as equal", () => {
    expect(comparePhaseIds("3A", "3a")).toBe(0);
  });

  test("has no answer for ids without a leading number", () => {
    expect(comparePhaseIds("A", "1")).toBeUndefined();
    expect(comparePhaseIds("1", "setup")).toBeUndefined();
  });
});

describe("phaseInRange", () => {
  test("includes letter phases of both bounds but not dotted inserts after the upper bound", () => {
    const ids = ["3", "4", "4a", "4.5", "5", "5a", "5.5", "6"];
    expect(ids.filter((id) => phaseInRange(id, "4", "5"))).toEqual(["4", "4a", "4.5", "5", "5a"]);
  });

  test("orders dotted bounds numerically", () => {
    expect(["9.8", "9.9", "9.10", "9.11"].filter((id) => phaseInRange(id, "9.9", "9.10"))).toEqual(["9.9", "9.10"]);
  });

  test("never matches an id without a leading number", () => {
    expect(phaseInRange("A", "1", "9")).toBe(false);
  });
});
