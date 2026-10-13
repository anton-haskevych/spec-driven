import { describe, expect, test } from "bun:test";
import { durationMs } from "../core/duration";

describe("durationMs", () => {
  test("seconds, minutes and hours", () => {
    expect(durationMs("30s")).toBe(30_000);
    expect(durationMs("25m")).toBe(1_500_000);
    expect(durationMs("1h")).toBe(3_600_000);
  });

  test("anything else is undefined", () => {
    for (const text of ["", "5", "5d", "1.5m", " 5m"]) expect(durationMs(text)).toBeUndefined();
  });
});
