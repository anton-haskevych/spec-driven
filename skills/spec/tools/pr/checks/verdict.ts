import type { Bucket, Check } from "./types";

export type Verdict =
  | { kind: "green"; passed: number; skipped: number }
  | { kind: "waiting"; running: Check[]; queued: Check[] }
  | { kind: "red"; failed: Check[] }
  | { kind: "cancelled"; cancelled: Check[] }
  | { kind: "none"; reason: "no-checks" | "skipped" };

export type VerdictKind = Verdict["kind"];

// The one answer to "is this PR green?", for pr status, pr wait and the board.
// `checks` must already hold one row per workflow + name (rollupToChecks), so a cancelled row has no newer run.
export function checksVerdict(checks: readonly Check[], isExternal: (check: Check) => boolean): Verdict {
  const counted = checks.filter((check) => !isExternal(check));
  const inBucket = (bucket: Bucket) => counted.filter((check) => check.bucket === bucket);
  const failed = inBucket("fail");
  if (failed.length > 0) return { kind: "red", failed };
  const cancelled = inBucket("cancel");
  if (cancelled.length > 0) return { kind: "cancelled", cancelled };
  const running = inBucket("running");
  const queued = inBucket("queued");
  if (running.length + queued.length > 0) return { kind: "waiting", running, queued };
  if (counted.length === 0) return { kind: "none", reason: "no-checks" };
  const passed = inBucket("pass").length;
  return passed > 0 ? { kind: "green", passed, skipped: inBucket("skipping").length } : { kind: "none", reason: "skipped" };
}

// `checks.external` globs: checks that never block a merge.
export function externalMatcher(patterns: readonly string[]): (check: Check) => boolean {
  const globs = patterns.map((pattern) => new Bun.Glob(pattern));
  return (check) => globs.some((glob) => glob.match(check.name));
}
