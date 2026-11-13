import { gitAt } from "../../core/git";
import { defaultBranch, systemRunner, type Runner } from "../../core/run";
import { loadSettings } from "../../playbook/settings";
import { jobLogDir, savedJobLogs } from "../../pr/failures/job-logs";
import { ghClient } from "../../pr/gh";
import { renderReport } from "../../pr/render";
import { buildReport, type PrReport } from "../../pr/report";
import { resolvePr, specOfTarget } from "../../pr/resolve";
import { plansOnDemandAt } from "../../plan/read-plans";
import { prObservedOf } from "../../plan/pr-observed";
import { recordPr } from "../../plan/pr-sync-send";
import type { Env } from "../../core/env";

export const PR_STATUS_USAGE = "pr status [<pr> | <spec-name> [<group>]]";

export async function prStatus(projectDir: string, args: readonly string[], runner: Runner = systemRunner, now = new Date(), env: Env = process.env): Promise<string> {
  if (args.length > 2) return `usage: ${PR_STATUS_USAGE}`;
  const gh = ghClient(projectDir, runner);
  const plans = plansOnDemandAt(projectDir, runner, now);
  const resolved = resolvePr(gh, projectDir, args, plans);
  if (!resolved.ok) return `pr status: ${resolved.reason}`;
  const { view, otherPrs } = resolved.value;
  const settings = loadSettings(projectDir);
  const report = buildReport(gh, view, {
    externalPatterns: settings.checks.external,
    defaultBranch: defaultBranch(projectDir, runner),
    otherPrs,
    jobLogs: savedJobLogs(gh.jobLog, jobLogDir(gitAt(projectDir, runner), view.number)),
    ...(settings.gates.ciTriage ? { triageGate: settings.gates.ciTriage } : {}),
  });
  const spec = specOfTarget(args, report.view);
  const joined = spec === undefined ? undefined : plans.joined(spec);
  const notes = joined ? await recordPr(projectDir, joined, prObservedOf(report.view, greenOf(report.state)), "pr status", { runner, env, now: () => now }) : [];
  return [renderReport(report, now), ...notes].join("\n");
}

// A PR whose checks couldn't be read says nothing about green.
function greenOf(state: PrReport["state"]): boolean | undefined {
  return state === "unknown" ? undefined : state === "green";
}
