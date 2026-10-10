export interface PollClock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export interface PollOptions {
  intervalMs: number;
  timeoutMs: number;
  clock: PollClock;
}

export interface Polled<T> {
  value: T;
  settled: boolean;
}

export const systemClock: PollClock = { now: () => Date.now(), sleep: (ms) => Bun.sleep(ms) };

export async function pollUntil<T>(read: () => T | Promise<T>, settled: (value: T) => boolean, options: PollOptions): Promise<Polled<T>> {
  const { intervalMs, timeoutMs, clock } = options;
  const deadline = clock.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (settled(value)) return { value, settled: true };
    const left = deadline - clock.now();
    if (left <= 0) return { value, settled: false };
    await clock.sleep(Math.min(intervalMs, left));
  }
}
