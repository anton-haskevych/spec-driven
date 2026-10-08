const DAY_MS = 24 * 60 * 60 * 1000;

export function olderThanDays(then: Date, now: Date, days: number): boolean {
  return then.getTime() < now.getTime() - days * DAY_MS;
}
