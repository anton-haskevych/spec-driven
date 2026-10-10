import { prState, summarizeChecks, type CheckSummary, type PrState } from "./checks/checks";
import type { Result } from "../core/result";
import type { GhClient } from "./gh";
import { savedJobLogs, type JobLogs } from "./failures/job-logs";
import { failureTail } from "./failures/log-tail";
import { compareOnMain, type MainComparison } from "./failures/main-compare";
import { infraFact, type InfraFact } from "./failures/triage";
import type { Check, PrView } from "./checks/types";
import { externalMatcher } from "./checks/verdict";

export interface FailedCheckReport {
  check: Check;
  job: { runId: number; jobId: number } | undefined;
  main?: MainComparison;
  infra?: Result<InfraFact>;
  tail?: Result<string[]>;
  logPath?: string;
}

export interface PrReport {
  view: PrView;
  state: PrState;
  summary: CheckSummary | undefined;
  externalPatterns: readonly string[];
  failures: FailedCheckReport[];
  otherPrs: readonly number[];
  triageGate?: string;
}

export interface ReportOptions {
  externalPatterns: readonly string[];
  defaultBranch: string | undefined;
  otherPrs?: readonly number[];
  jobLogs?: JobLogs;
  triageGate?: string;
}

export function buildReport(gh: GhClient, firstView: PrView, options: ReportOptions): PrReport {
  const view = settledView(gh, firstView);
  const base = {
    view,
    externalPatterns: options.externalPatterns,
    otherPrs: options.otherPrs ?? [],
    failures: [],
    ...(options.triageGate ? { triageGate: options.triageGate } : {}),
  };
  if (view.state !== "OPEN") return { ...base, state: prState(view, undefined), summary: undefined };

  const summary = summarizeChecks(view.checks, options.externalPatterns);
  const jobLogs = options.jobLogs ?? savedJobLogs(gh.jobLog, undefined);
  const failures = failedOrCancelled(view.checks, options.externalPatterns).map((check) => failedCheck(gh, jobLogs, check, options.defaultBranch));
  return { ...base, state: prState(view, summary), summary, failures };
}

function failedOrCancelled(checks: readonly Check[], externalPatterns: readonly string[]): Check[] {
  const isExternal = externalMatcher(externalPatterns);
  const counted = checks.filter((check) => !isExternal(check));
  return [...counted.filter((check) => check.bucket === "fail"), ...counted.filter((check) => check.bucket === "cancel")];
}

// GitHub computes mergeability lazily; one re-poll usually settles it.
function settledView(gh: GhClient, view: PrView): PrView {
  if (view.state !== "OPEN" || view.mergeable !== "UNKNOWN") return view;
  const again = gh.prView(view.number);
  return again.ok ? again.value : view;
}

function failedCheck(gh: GhClient, jobLogs: JobLogs, check: Check, defaultBranch: string | undefined): FailedCheckReport {
  const job = check.runId !== undefined && check.jobId !== undefined ? { runId: check.runId, jobId: check.jobId } : undefined;
  if (!job) return { check, job };
  const log = jobLogs(job.jobId);
  const run = gh.run(job.runId);
  const main: MainComparison = defaultBranch
    ? compareOnMain(gh, { name: check.name, runId: job.runId }, defaultBranch)
    : { kind: "unavailable", reason: "no default branch" };
  return {
    check,
    job,
    main,
    infra: run.ok ? { ok: true, value: infraFact(job.jobId, run.value, log.ok ? log.value.text : undefined) } : run,
    tail: log.ok ? { ok: true, value: failureTail(log.value.text) } : log,
    ...(log.ok && log.value.path ? { logPath: log.value.path } : {}),
  };
}
