const DURATION = /^(\d+)(s|m|h)$/;
const UNIT_MS: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000 };

// A wait's `--timeout 25m` / `--interval 30s`.
export function durationMs(text: string): number | undefined {
  const match = DURATION.exec(text);
  return match?.[1] && match[2] ? Number(match[1]) * (UNIT_MS[match[2]] ?? 0) : undefined;
}
