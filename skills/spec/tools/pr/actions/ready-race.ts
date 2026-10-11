import type { Result } from "../../core/result";
import { pollUntil, type PollClock } from "../babysit/poll";
import type { CommitRun } from "../checks/types";
import type { GhClient } from "../gh";
import type { GhWrites } from "./gh-writes";

export type RaceReads = Pick<GhClient, "commitRuns" | "runJobs">;

export type ReadyOutcome = { kind: "started"; runId: number } | { kind: "skipped" } | { kind: "no-run"; waitedMs: number };

export interface RaceDeps {
  reads: RaceReads;
  writes: Pick<GhWrites, "ready">;
  clock: PollClock;
}

// Bounded at 90 s together, so pr open fits a foreground Bash call with timeout 180000.
export const READY_RACE_TIMINGS = { registerMs: 30_000, readyRunMs: 45_000, intervalMs: 5_000 } as const;

// CRM git-workflow.md:23-34: a push's draft-time run that registers after `gh pr ready` skips itself and
// cancels the real run. So: let the push's runs register first; the ready run is then the run id that
// wasn't there before. `gh run list` can't name a ready_for_review run, so ids are the only key.
export async function markReadySafely(pr: number, sha: string, deps: RaceDeps): Promise<Result<ReadyOutcome>> {
  const { reads, writes, clock } = deps;
  const { registerMs, readyRunMs, intervalMs } = READY_RACE_TIMINGS;
  const runsNow = () => {
    const runs = reads.commitRuns(sha);
    return runs.ok ? runs.value : [];
  };

  const registered = await pollUntil(runsNow, (runs) => runs.length > 0, { intervalMs, timeoutMs: registerMs, clock });
  const known = new Set(registered.value.map((run) => run.id));
  const marked = writes.ready(pr);
  if (!marked.ok) return marked;

  const newRuns = () => runsNow().filter((run) => !known.has(run.id));
  const readyRuns = await pollUntil(newRuns, (runs) => runs.length > 0, { intervalMs, timeoutMs: readyRunMs, clock });
  if (!readyRuns.settled) return { ok: true, value: { kind: "no-run", waitedMs: readyRunMs } };

  await clock.sleep(intervalMs);
  const rechecked = newRuns();
  const live = newestLiveRun(rechecked.length > 0 ? rechecked : readyRuns.value, reads);
  return { ok: true, value: live === undefined ? { kind: "skipped" } : { kind: "started", runId: live.id } };
}

// Queued counts as started: a run with no jobs yet, or a first job not yet concluded, is live.
function newestLiveRun(runs: readonly CommitRun[], reads: RaceReads): CommitRun | undefined {
  const byNewest = [...runs].sort((a, b) => b.id - a.id);
  return byNewest.find((run) => {
    if (run.conclusion === "cancelled" || run.conclusion === "skipped") return false;
    const jobs = reads.runJobs(run.id);
    return !jobs.ok || jobs.value[0]?.conclusion !== "skipped";
  });
}
