import type { Result } from "../../core/result";
import type { RunDetail } from "../checks/types";

export type InfraFact = { infra: true; reason: string } | { infra: false; reason?: string };

const INFRA_LOG_SIGNATURES: ReadonlyArray<readonly [text: string, reason: string]> = [
  ["lost communication with the server", "runner lost"],
  ["The runner has received a shutdown signal", "runner shut down"],
  ["No space left on device", "disk full"],
  ["The job was not acquired by Runner", "no runner"],
];
const TIMEOUT = "exceeded the maximum execution time";
const STARTUP_FAILURE = "startup_failure";
const FAILED = new Set(["failure", "timed_out"]);

// Only infrastructure failures may be re-run (ledger decision-flaky-tests-strict): a timeout or a
// job cancelled because a sibling failed is the code's problem, not the runner's.
// `projectSignatures` (settings `checks.infra-signatures`): lines a project's own tests print when a service
// they depend on is down, so a rerun is the answer.
export function infraFact(jobId: number, run: RunDetail, log: string | undefined, projectSignatures: readonly string[] = []): InfraFact {
  const job = run.jobs.find((candidate) => candidate.id === jobId);
  if (run.conclusion === STARTUP_FAILURE || job?.conclusion === STARTUP_FAILURE) return { infra: true, reason: "never started" };
  const signature = log === undefined ? undefined : signatureIn(log, projectSignatures);
  if (signature) return { infra: true, reason: signature };
  return job?.conclusion === "cancelled" ? cancelledFact(jobId, run, log) : { infra: false };
}

function signatureIn(log: string, projectSignatures: readonly string[]): string | undefined {
  const runner = INFRA_LOG_SIGNATURES.find(([text]) => log.includes(text));
  if (runner) return runner[1];
  const project = projectSignatures.find((text) => log.includes(text));
  return project === undefined ? undefined : `project signature "${project}"`;
}

// A job that never started has no log to read; for anything else, no log means no answer.
export function infraFromLog(jobId: number, run: RunDetail, log: Result<string>, projectSignatures: readonly string[] = []): Result<InfraFact> {
  const fact = infraFact(jobId, run, log.ok ? log.value : undefined, projectSignatures);
  return log.ok || fact.infra ? { ok: true, value: fact } : { ok: false, reason: `no log (${log.reason})` };
}

function cancelledFact(jobId: number, run: RunDetail, log: string | undefined): InfraFact {
  const failedSibling = run.jobs.find((candidate) => candidate.id !== jobId && FAILED.has(candidate.conclusion));
  if (failedSibling) return { infra: false, reason: `cancelled after ${failedSibling.name} failed` };
  if (log === undefined) return { infra: false, reason: "cancelled; no log to rule out a timeout" };
  return log.includes(TIMEOUT) ? { infra: false, reason: "timed out" } : { infra: true, reason: "cancelled" };
}
