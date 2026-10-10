import { describe, expect, test } from "bun:test";
import { clockDuration, shortDuration } from "../pr/durations";

describe("clockDuration", () => {
  test("minutes and zero-padded seconds; hours past 60m; seconds under a minute", () => {
    expect(clockDuration(432_000)).toBe("7m12s");
    expect(clockDuration(543_000)).toBe("9m03s");
    expect(clockDuration(45_400)).toBe("45s");
    expect(clockDuration(3_720_000)).toBe("1h02m");
  });
});

describe("shortDuration", () => {
  test("whole minutes, seconds under a minute", () => {
    expect(shortDuration(130_000)).toBe("2m");
    expect(shortDuration(40_000)).toBe("40s");
    expect(shortDuration(3_900_000)).toBe("1h05m");
  });
});
