import type { GhClient } from "./gh";

export type MainComparison =
  | { kind: "ran"; runId: number; day: string; conclusion: string }
  | { kind: "not-run"; runs: number }
  | { kind: "unavailable"; reason: string };

export const MAIN_RUNS_PER_JOB = 15;
const DID_NOT_RUN = new Set(["skipped", "cancelled", ""]);

export function compareOnMain(gh: GhClient, failed: { name: string; runId: number }, branch: string): MainComparison {
  const workflowId = gh.runWorkflowId(failed.runId);
  if (!workflowId.ok) return { kind: "unavailable", reason: workflowId.reason };
  const runs = gh.branchRuns(branch, workflowId.value, MAIN_RUNS_PER_JOB);
  if (!runs.ok) return { kind: "unavailable", reason: runs.reason };

  for (const run of runs.value.filter((candidate) => !DID_NOT_RUN.has(candidate.conclusion))) {
    const jobs = gh.runJobs(run.id);
    if (!jobs.ok) return { kind: "unavailable", reason: jobs.reason };
    const job = jobs.value.find((candidate) => candidate.name === failed.name);
    if (job && !DID_NOT_RUN.has(job.conclusion)) {
      return { kind: "ran", runId: run.id, day: run.createdAt.slice(0, 10), conclusion: job.conclusion };
    }
  }
  return { kind: "not-run", runs: runs.value.length };
}
