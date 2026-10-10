import { prState, summarizeChecks, type CheckSummary, type PrState } from "./checks/checks";
import type { Result } from "../core/result";
import type { GhClient } from "./gh";
import { failureTail } from "./failures/log-tail";
import { compareOnMain, type MainComparison } from "./failures/main-compare";
import type { Check, PrView } from "./checks/types";

export interface FailedCheckReport {
  check: Check;
  job: { runId: number; jobId: number } | undefined;
  main?: MainComparison;
  tail?: Result<string[]>;
}

export interface PrReport {
  view: PrView;
  state: PrState;
  summary: CheckSummary | undefined;
  externalPatterns: readonly string[];
  failures: FailedCheckReport[];
  otherPrs: readonly number[];
}

export const TAILS_SHOWN = 3;

export interface ReportOptions {
  externalPatterns: readonly string[];
  defaultBranch: string | undefined;
  otherPrs?: readonly number[];
}

export function buildReport(gh: GhClient, firstView: PrView, options: ReportOptions): PrReport {
  const view = settledView(gh, firstView);
  const base = { view, externalPatterns: options.externalPatterns, otherPrs: options.otherPrs ?? [], failures: [] };
  if (view.state !== "OPEN") return { ...base, state: prState(view, undefined), summary: undefined };

  const summary = summarizeChecks(view.checks, options.externalPatterns);
  const failures = summary.failing.map((check, index) => failedCheck(gh, check, options.defaultBranch, index < TAILS_SHOWN));
  return { ...base, state: prState(view, summary), summary, failures };
}

// GitHub computes mergeability lazily; one re-poll usually settles it.
function settledView(gh: GhClient, view: PrView): PrView {
  if (view.state !== "OPEN" || view.mergeable !== "UNKNOWN") return view;
  const again = gh.prView(view.number);
  return again.ok ? again.value : view;
}

function failedCheck(gh: GhClient, check: Check, defaultBranch: string | undefined, withTail: boolean): FailedCheckReport {
  const job = check.runId !== undefined && check.jobId !== undefined ? { runId: check.runId, jobId: check.jobId } : undefined;
  if (!job) return { check, job };
  const main: MainComparison = defaultBranch
    ? compareOnMain(gh, { name: check.name, runId: job.runId }, defaultBranch)
    : { kind: "unavailable", reason: "no default branch" };
  return withTail ? { check, job, main, tail: jobTail(gh, job.jobId) } : { check, job, main };
}

// Each job log is a full download (often over 1 MB), so only the first few failures get one.
function jobTail(gh: GhClient, jobId: number): Result<string[]> {
  const log = gh.jobLog(jobId);
  return log.ok ? { ok: true, value: failureTail(log.value) } : log;
}
