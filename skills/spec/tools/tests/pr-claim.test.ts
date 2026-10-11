import { describe, expect, test } from "bun:test";
import { isPrGroup, prClaimGroup, prClaimId } from "../claims/pr-claim";

describe("PR claim ids", () => {
  test("a PR group's claim is pr-<group>, and reads back to the group", () => {
    expect(prClaimId("A")).toBe("pr-A");
    expect(prClaimGroup("pr-A")).toBe("A");
    expect(prClaimGroup("pr-c3")).toBe("c3");
  });

  test("a phase id or anything else is not a PR claim", () => {
    for (const id of ["7", "7a", "pr-", "pr", "pr-a-b", "PR-A", "phase-7"]) expect(prClaimGroup(id)).toBeUndefined();
  });

  test("a group token is letters and digits", () => {
    expect(["A", "b", "c3"].every(isPrGroup)).toBe(true);
    expect(["", "a-b", "a b", "pr-A"].some(isPrGroup)).toBe(false);
  });
});
