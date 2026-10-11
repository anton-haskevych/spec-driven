import { describe, expect, test } from "bun:test";
import { ago, prCell } from "../board/cells";

describe("ago", () => {
  const now = new Date("2026-10-01T20:00:00Z");
  test("says the largest whole unit, narrow", () => {
    expect(ago(new Date("2026-10-01T19:59:40Z"), now)).toBe("<1m");
    expect(ago(new Date("2026-10-01T19:58:00Z"), now)).toBe("2m");
    expect(ago(new Date("2026-10-01T16:30:00Z"), now)).toBe("3h");
    expect(ago(new Date("2026-09-29T19:00:00Z"), now)).toBe("2d");
  });
});

describe("prCell", () => {
  test("marks failing, pending, passing, unknown checks and PRs missing from the lists", () => {
    expect(prCell({ number: 1, listed: true, failing: 2, pending: 1, passing: 4 })).toBe("#1 ✗ 2");
    expect(prCell({ number: 1, listed: true, failing: 1, passing: 4, babysitting: true })).toBe("#1 babysitting");
    expect(prCell({ number: 1, listed: true, failing: 0, pending: 3, passing: 4 })).toBe("#1 … 3");
    expect(prCell({ number: 1, listed: true, draft: true, failing: 0, pending: 0, passing: 4 })).toBe("#1 draft ✓");
    expect(prCell({ number: 1, listed: true, failing: 0, pending: 0, passing: 0 })).toBe("#1");
    expect(prCell({ number: 1, listed: true })).toBe("#1");
    expect(prCell({ number: 1, listed: false })).toBe("#1 ?");
    expect(prCell(undefined)).toBe("—");
  });

  test("says merged or closed instead of checks, and ? when gh couldn't list PRs", () => {
    expect(prCell({ number: 8, listed: true, state: "merged" })).toBe("#8 merged");
    expect(prCell({ number: 3, listed: true, state: "closed" })).toBe("#3 closed");
    expect(prCell("unknown")).toBe("?");
  });
});
