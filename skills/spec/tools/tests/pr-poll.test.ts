import { describe, expect, test } from "bun:test";
import { pollUntil } from "../pr/babysit/poll";
import { fakeClock } from "./fake-clock";

describe("pollUntil", () => {
  test("returns the first settled read without sleeping", async () => {
    const clock = fakeClock();
    expect(await pollUntil(() => 3, (n) => n > 2, { intervalMs: 5_000, timeoutMs: 30_000, clock })).toEqual({ value: 3, settled: true });
    expect(clock.sleeps).toEqual([]);
  });

  test("reads again every interval until the value settles", async () => {
    const clock = fakeClock();
    const reads = [0, 1, 2, 3];
    const result = await pollUntil(async () => reads.shift()!, (n) => n === 2, { intervalMs: 5_000, timeoutMs: 30_000, clock });
    expect(result).toEqual({ value: 2, settled: true });
    expect(clock.sleeps).toEqual([5_000, 5_000]);
  });

  test("gives up at the deadline with the last read, never sleeping past it", async () => {
    const clock = fakeClock();
    let reads = 0;
    const result = await pollUntil(() => ++reads, () => false, { intervalMs: 4_000, timeoutMs: 10_000, clock });
    expect(result).toEqual({ value: 4, settled: false });
    expect(clock.sleeps).toEqual([4_000, 4_000, 2_000]);
  });
});
