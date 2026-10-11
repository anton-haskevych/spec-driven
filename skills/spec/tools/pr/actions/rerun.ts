import { gitAt } from "../../core/git";
import type { Result } from "../../core/result";
import type { Runner } from "../../core/run";
import { loadSettings } from "../../playbook/settings";
import { babysitLogger } from "../babysit/log";
import { failedOrCancelled } from "../checks/checks";
import type { PrView } from "../checks/types";
import { externalMatcher } from "../checks/verdict";
import { jobLogDir, savedJobLogs, type JobLogs } from "../failures/job-logs";
import { infraFromLog } from "../failures/triage";
import { ghClient, type GhClient } from "../gh";
import { SHORT_SHA } from "../render";
import { resolvePr } from "../resolve";
import { ghWrites } from "./gh-writes";
import { planRerun, rerunLine, type RerunCandidate } from "./rerun-plan";

export interface RerunDeps {
  runner: Runner;
  now: () => Date;
}

export function rerunPr(projectDir: string, target: readonly string[], deps: RerunDeps): string {
  const gh = ghClient(projectDir, deps.runner);
  const resolved = resolvePr(gh, projectDir, target);
  if (!resolved.ok) return `pr rerun: ${resolved.reason}`;
  const { view } = resolved.value;
  if (view.state !== "OPEN") return `pr rerun: #${view.number} is ${view.state.toLowerCase()}`;

  const git = gitAt(projectDir, deps.runner);
  const candidates = rerunCandidates(gh, view, loadSettings(projectDir).checks.external, savedJobLogs(gh.jobLog, jobLogDir(git, view.number)));
  if (!candidates.ok) return `pr rerun: ${candidates.reason}`;
  const plan = planRerun(candidates.value);
  if (plan.kind === "refuse") return plan.reason;

  const writes = ghWrites(projectDir, deps.runner);
  const log = babysitLogger(git, deps.now);
  const lines: string[] = [];
  for (const run of plan.runs) {
    const rerun = writes.rerun(run.runId, run.jobs.map((job) => job.jobId));
    if (!rerun.ok) return [...lines, `pr rerun: ${rerun.reason}`].join("\n");
    const line = rerunLine(run);
    log(view.number, { event: "rerun", sha: view.headRefOid.slice(0, SHORT_SHA), detail: line });
    lines.push(line);
  }
  return `Rerun: ${lines.join("; ")}`;
}

function rerunCandidates(gh: GhClient, view: PrView, externalPatterns: readonly string[], jobLogs: JobLogs): Result<RerunCandidate[]> {
  const candidates: RerunCandidate[] = [];
  for (const check of failedOrCancelled(view.checks, externalMatcher(externalPatterns))) {
    if (check.runId === undefined || check.jobId === undefined) return { ok: false, reason: `${check.name} is not an Actions job — it can't be re-run` };
    const run = gh.run(check.runId);
    if (!run.ok) return run;
    const log = jobLogs(check.jobId);
    candidates.push({ check, jobId: check.jobId, run: run.value, fact: infraFromLog(check.jobId, run.value, log.ok ? { ok: true, value: log.value.text } : log) });
  }
  return { ok: true, value: candidates };
}
