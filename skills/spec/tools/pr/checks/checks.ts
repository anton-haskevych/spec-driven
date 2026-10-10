import { BUCKETS, type Bucket, type Check, type PrView } from "./types";
import { checksVerdict, externalMatcher, type Verdict, type VerdictKind } from "./verdict";

export interface CheckSummary {
  counts: Record<Bucket, number>;
  external: number;
  failing: Check[];
  verdict: Verdict;
}

export type PrState = "merged" | "closed" | "conflicting" | "draft" | VerdictKind | "unknown";

const ACTIONS_JOB = /\/actions\/runs\/(\d+)\/job\/(\d+)/;

export function summarizeChecks(checks: readonly Check[], externalPatterns: readonly string[]): CheckSummary {
  const isExternal = externalMatcher(externalPatterns);
  const counted = checks.filter((check) => !isExternal(check));
  const counts = Object.fromEntries(BUCKETS.map((bucket) => [bucket, 0])) as Record<Bucket, number>;
  for (const check of counted) counts[check.bucket] += 1;
  return {
    counts,
    external: checks.length - counted.length,
    failing: counted.filter((check) => check.bucket === "fail"),
    verdict: checksVerdict(checks, isExternal),
  };
}

// Failed rows first: they are the ones a fix is for; cancelled ones may be re-run.
export function failedOrCancelled(checks: readonly Check[], isExternal: (check: Check) => boolean): Check[] {
  const counted = checks.filter((check) => !isExternal(check));
  return [...counted.filter((check) => check.bucket === "fail"), ...counted.filter((check) => check.bucket === "cancel")];
}

export function prState(view: PrView, summary: CheckSummary | undefined): PrState {
  if (view.state === "MERGED") return "merged";
  if (view.state === "CLOSED") return "closed";
  if (view.mergeable === "CONFLICTING") return "conflicting";
  if (view.isDraft) return "draft";
  if (!summary) return "unknown";
  const { kind } = summary.verdict;
  return kind === "green" && view.mergeable === "UNKNOWN" ? "unknown" : kind;
}

export function actionsJob(link: string): { runId: number; jobId: number } | undefined {
  const match = ACTIONS_JOB.exec(link);
  return match ? { runId: Number(match[1]), jobId: Number(match[2]) } : undefined;
}
