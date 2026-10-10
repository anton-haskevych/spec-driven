const SECOND_MS = 1000;
const MINUTE_S = 60;
const HOUR_S = 3600;

const pad = (value: number) => String(value).padStart(2, "0");

// "7m12s": how long a running or failed check took, to the second.
export function clockDuration(ms: number): string {
  const seconds = Math.floor(ms / SECOND_MS);
  if (seconds < MINUTE_S) return `${seconds}s`;
  if (seconds < HOUR_S) return `${Math.floor(seconds / MINUTE_S)}m${pad(seconds % MINUTE_S)}s`;
  return `${Math.floor(seconds / HOUR_S)}h${pad(Math.floor((seconds % HOUR_S) / MINUTE_S))}m`;
}

// "2m": a passed check's duration, rounded to the minute.
export function shortDuration(ms: number): string {
  const seconds = Math.round(ms / SECOND_MS);
  if (seconds < MINUTE_S) return `${seconds}s`;
  const minutes = Math.round(seconds / MINUTE_S);
  return minutes < MINUTE_S ? `${minutes}m` : `${Math.floor(minutes / MINUTE_S)}h${pad(minutes % MINUTE_S)}m`;
}

export function spanMs(startedAt: string | undefined, endedAt: string | Date | undefined): number | undefined {
  if (!startedAt || !endedAt) return undefined;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : undefined;
}
