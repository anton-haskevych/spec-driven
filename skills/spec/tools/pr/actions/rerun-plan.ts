import type { Check, RunDetail } from "../checks/types";
import type { InfraFact } from "../failures/triage";

export interface RerunCandidate {
  check: Check;
  jobId: number;
  run: RunDetail;
  fact: InfraFact;
}

export interface RunRerun {
  runId: number;
  attempt: number;
  jobs: Array<{ jobId: number; name: string; reason: string }>;
}

export type RerunPlan = { kind: "refuse"; reason: string } | { kind: "rerun"; runs: RunRerun[] };

// GitHub's own attempt counter is the cap (two re-runs); the babysit log is never read for it.
export const MAX_ATTEMPTS = 3;

// All or nothing: a test failure is fixed and pushed, and the push runs CI again anyway.
export function planRerun(candidates: readonly RerunCandidate[]): RerunPlan {
  if (candidates.length === 0) return refuse("nothing failed or cancelled");
  const notInfra = candidates.find(({ fact }) => !fact.infra);
  if (notInfra) return refuse(`${notInfra.check.name} ${notInfra.fact.reason ?? "failed in a test"}, not infra — fix it`);
  const runs = byRun(candidates);
  const running = runs.find(({ run }) => run.status !== "completed");
  if (running) return refuse(`run ${running.run.id} still running — wait`);
  const capped = runs.find(({ run }) => run.attempt >= MAX_ATTEMPTS);
  if (capped) return refuse(`run ${capped.run.id} already ran ${MAX_ATTEMPTS} times (${capped.names.join(", ")}) — stop and ask`);
  return { kind: "rerun", runs: runs.map(({ run, jobs }) => ({ runId: run.id, attempt: run.attempt, jobs })) };
}

export function rerunLine({ runId, attempt, jobs }: RunRerun): string {
  return `${jobs.map((job) => `${job.name} (${job.reason})`).join(", ")} · attempt ${attempt + 1} of ${MAX_ATTEMPTS} · run ${runId}`;
}

function byRun(candidates: readonly RerunCandidate[]) {
  const runs = new Map<number, { run: RunDetail; jobs: RunRerun["jobs"]; names: string[] }>();
  for (const { check, jobId, run, fact } of candidates) {
    const entry = runs.get(run.id) ?? { run, jobs: [], names: [] };
    entry.jobs.push({ jobId, name: check.name, reason: fact.reason ?? "infra" });
    entry.names.push(check.name);
    runs.set(run.id, entry);
  }
  return [...runs.values()];
}

function refuse(reason: string): RerunPlan {
  return { kind: "refuse", reason: `pr rerun: ${reason}` };
}
