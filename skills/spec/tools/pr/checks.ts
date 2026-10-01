import { BUCKETS, type Bucket, type Check, type PrView } from "./types";

export interface CheckSummary {
  counts: Record<Bucket, number>;
  external: number;
  failing: Check[];
}

export type PrState = "merged" | "closed" | "conflicting" | "draft" | "red" | "pending" | "green" | "unknown";

const ACTIONS_JOB = /\/actions\/runs\/(\d+)\/job\/(\d+)/;

export function summarizeChecks(checks: readonly Check[], externalPatterns: readonly string[]): CheckSummary {
  const globs = externalPatterns.map((pattern) => new Bun.Glob(pattern));
  const isExternal = (check: Check) => globs.some((glob) => glob.match(check.name));
  const counted = checks.filter((check) => !isExternal(check));
  const counts = Object.fromEntries(BUCKETS.map((bucket) => [bucket, 0])) as Record<Bucket, number>;
  for (const check of counted) counts[check.bucket] += 1;
  return { counts, external: checks.length - counted.length, failing: counted.filter((check) => check.bucket === "fail") };
}

export function prState(view: PrView, summary: CheckSummary | undefined): PrState {
  if (view.state === "MERGED") return "merged";
  if (view.state === "CLOSED") return "closed";
  if (view.mergeable === "CONFLICTING") return "conflicting";
  if (view.isDraft) return "draft";
  if (!summary) return "unknown";
  if (summary.counts.fail > 0) return "red";
  if (summary.counts.pending > 0) return "pending";
  return view.mergeable === "UNKNOWN" ? "unknown" : "green";
}

export function actionsJob(link: string): { runId: number; jobId: number } | undefined {
  const match = ACTIONS_JOB.exec(link);
  return match ? { runId: Number(match[1]), jobId: Number(match[2]) } : undefined;
}
