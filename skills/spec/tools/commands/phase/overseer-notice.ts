import type { Env } from "../../core/env";
import type { Result } from "../../core/result";
import type { Runner } from "../../core/run";
import { whoseRun } from "../../crew/overseer";
import { specRun } from "../../crew/scope";
import { appendNotice, type PhaseOutcome, type PhaseWriter, type Written } from "../../plan/phase-writer";
import { defaultClaudeHome, loadLiveSessions, type LiveSession } from "../../sessions/live";
import { ownSessionId } from "../../sessions/own";
import { psProcStarts } from "../../sessions/proc-starts";

// The live overseer of a spec when it isn't this session.
export type OverseerOf = (spec: string) => string | undefined;

// Only plan-shape writes, from anyone but the overseer: a worker splitting its own phase reaches the overseer
// too. It never refuses; ticks, notes, parks and deploys pass silently.
export function withOverseerNotice(writer: PhaseWriter, spec: string, overseerOf: OverseerOf): PhaseWriter {
  const noticed = <Request>(write: (request: Request) => Written) => (request: Request): Written => {
    const written = write(request);
    return written instanceof Promise ? written.then((outcome) => withNotice(outcome, spec, overseerOf)) : withNotice(written, spec, overseerOf);
  };
  return {
    ...writer,
    add: noticed((request) => writer.add(request)),
    split: noticed((request) => writer.split(request)),
    move: noticed((request) => writer.move(request)),
    set: noticed((request) => writer.set(request)),
    task: noticed((request) => writer.task(request)),
  };
}

function withNotice(outcome: PhaseOutcome, spec: string, overseerOf: OverseerOf): PhaseOutcome {
  if (outcome.kind !== "landed" && outcome.kind !== "queued") return outcome;
  const overseer = overseerOf(spec);
  return overseer ? appendNotice(outcome, `Notice: ${spec} is overseen by ${overseer}; tell it about this change (SendMessage "${spec} oversee-crew")`) : outcome;
}

// Liveness is read only once a run file is found; whoseRun follows an overseer's tab parked into a new session.
export function overseerNoticeFor(projectDir: string, deps: { runner: Runner; env: Env }, liveSessions: () => Result<LiveSession[]> = () => loadLiveSessions(defaultClaudeHome(), psProcStarts(deps.runner))): OverseerOf {
  return (spec) => {
    const run = specRun(projectDir, deps.runner, spec);
    const overseer = run.ok ? run.value?.overseer : undefined;
    if (overseer === undefined) return undefined;
    const sessions = liveSessions();
    if (!sessions.ok) return undefined;
    const verdict = whoseRun(overseer, sessions.value, ownSessionId(deps.env));
    return verdict.kind === "other" ? verdict.id : undefined;
  };
}
