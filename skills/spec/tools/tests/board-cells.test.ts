import { describe, expect, test } from "bun:test";
import { ago, alignColumns, prCell } from "../board/cells";

describe("alignColumns", () => {
  test("pads every column but the last to its widest cell, measuring glyphs by display width", () => {
    expect(alignColumns([["★ a", "x", ""], ["bbbb", "yy", "end"]])).toEqual(["★ a   x", "bbbb  yy  end"]);
  });
});

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
    expect(prCell({ number: 1, listed: true, failing: 2, pending: 1 })).toBe("#1 ✗ 2");
    expect(prCell({ number: 1, listed: true, failing: 0, pending: 3 })).toBe("#1 … 3");
    expect(prCell({ number: 1, listed: true, draft: true, failing: 0, pending: 0 })).toBe("#1 draft ✓");
    expect(prCell({ number: 1, listed: true })).toBe("#1");
    expect(prCell({ number: 1, listed: false })).toBe("#1 ?");
    expect(prCell(undefined)).toBe("—");
  });
});
