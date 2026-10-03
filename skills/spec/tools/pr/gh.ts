import { firstLine } from "../core/git";
import type { Result } from "../core/result";
import type { Runner } from "../core/run";
import { parseJson, toChecks, toJobs, toPrView, toWorkflowId, toWorkflowRuns } from "./gh-records";
import type { Check, Job, PrView, WorkflowRun } from "./types";


export interface GhClient {
  prView(pr?: number): Result<PrView>;
  prChecks(pr: number): Result<Check[]>;
  runWorkflowId(runId: number): Result<number>;
  runJobs(runId: number): Result<Job[]>;
  jobLog(jobId: number): Result<string>;
  branchRuns(branch: string, workflowId: number, limit: number): Result<WorkflowRun[]>;
}

export const GH_CALL_BUDGET = 30;
const PR_FIELDS = "number,state,isDraft,mergeable,mergeStateStatus,headRefOid";
const CHECK_FIELDS = "name,state,bucket,workflow,link";
const RUN_FIELDS = "databaseId,conclusion,createdAt";

export function ghClient(cwd: string, runner: Runner, budget = GH_CALL_BUDGET): GhClient {
  let callsLeft = budget;
  const cache = new Map<string, Result<unknown>>();

  function call<T>(argv: string[], parse: (stdout: string) => T | undefined, cached = false): Result<T> {
    const key = argv.join(" ");
    if (cached && cache.has(key)) return cache.get(key) as Result<T>;
    if (callsLeft <= 0) return { ok: false, reason: `gh call budget (${budget}) spent` };
    callsLeft -= 1;
    const result = runner.run(["gh", ...argv], { cwd });
    const value = parse(result.stdout);
    const outcome: Result<T> =
      value === undefined ? { ok: false, reason: firstLine(result.stderr) || `gh ${argv[0]} ${argv[1]} gave no usable output` } : { ok: true, value };
    if (cached) cache.set(key, outcome);
    return outcome;
  }

  const json = <T>(convert: (value: unknown) => T | undefined) => (stdout: string) => convert(parseJson(stdout));
  return {
    prView: (pr) => call(["pr", "view", ...(pr === undefined ? [] : [String(pr)]), "--json", PR_FIELDS], json(toPrView)),
    prChecks: (pr) => call(["pr", "checks", String(pr), "--json", CHECK_FIELDS], json(toChecks)),
    runWorkflowId: (runId) => call(["run", "view", String(runId), "--json", "workflowDatabaseId"], json(toWorkflowId), true),
    runJobs: (runId) => call(["run", "view", String(runId), "--json", "jobs"], json(toJobs), true),
    jobLog: (jobId) => call(["api", `repos/{owner}/{repo}/actions/jobs/${jobId}/logs`], (stdout) => stdout || undefined),
    branchRuns: (branch, workflowId, limit) =>
      call(["run", "list", "--branch", branch, "--workflow", String(workflowId), "--limit", String(limit), "--json", RUN_FIELDS], json(toWorkflowRuns), true),
  };
}

