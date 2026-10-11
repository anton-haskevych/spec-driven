import type { PollClock } from "../pr/babysit/poll";

// Time moves only when the code under test sleeps, so waits run instantly and their lengths are checkable.
export function fakeClock(start = 0): PollClock & { sleeps: number[] } {
  let now = start;
  const sleeps: number[] = [];
  return { sleeps, now: () => now, sleep: async (ms) => void (sleeps.push(ms), (now += ms)) };
}
