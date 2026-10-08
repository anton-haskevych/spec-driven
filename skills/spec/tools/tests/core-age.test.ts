import { describe, expect, test } from "bun:test";
import { olderThanDays } from "../core/age";

const NOW = new Date("2026-10-07T12:00:00.000Z");

describe("olderThanDays", () => {
  test("is false at exactly N days", () => {
    expect(olderThanDays(new Date("2026-10-04T12:00:00.000Z"), NOW, 3)).toBe(false);
  });

  test("is true one millisecond past N days", () => {
    expect(olderThanDays(new Date("2026-10-04T11:59:59.999Z"), NOW, 3)).toBe(true);
  });

  test("is false for anything newer", () => {
    expect(olderThanDays(new Date("2026-10-07T11:00:00.000Z"), NOW, 2)).toBe(false);
  });
});
