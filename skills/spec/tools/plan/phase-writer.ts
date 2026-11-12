import type { Env } from "../core/env";
import type { Runner } from "../core/run";
import type { SpecFolder } from "../core/spec-folders";
import type { AddRequest } from "../phases/add";
import type { DeployedRequest } from "../phases/deployed";
import type { ParkRequest, UnparkRequest } from "../phases/park";
import type { MoveRequest } from "../phases/move";
import type { SetRequest } from "../phases/set";
import type { SplitRequest } from "../phases/split";
import type { TickRequest } from "../phases/tick";
import { pilotJoinedRefusal, type LocalPilot } from "../runtime/workflow-capabilities";
import { fileWriter } from "./file-writer";
import type { PlanMemory } from "./plan-version";
import type { PlanSource } from "./read-plans";
import { recordWriter } from "./record-writer";

// `invalid`: the request can't be written anywhere (bad phase, missing evidence); `refused`: the record said
// no, or the save before it failed. Neither wrote anything.
// `notice`: the plan changed under this session since it last saw it; printed before the result.
export type PhaseOutcome = (
  | { kind: "landed"; line: string }
  | { kind: "unchanged"; line: string }
  | { kind: "invalid"; reason: string }
  | { kind: "refused"; reason: string }
  | { kind: "queued"; pending: number }
) & { notice?: string };

// A spec in files answers at once; a joined spec waits on its record write.
type Written = PhaseOutcome | Promise<PhaseOutcome>;

export interface PhaseWriter {
  tick(request: TickRequest): Written;
  park(request: ParkRequest): Written;
  unpark(request: UnparkRequest): Written;
  deployed(request: DeployedRequest): Written;
  add(request: AddRequest): Written;
  split(request: SplitRequest): Written;
  move(request: MoveRequest): Written;
  set(request: SetRequest): Written;
}

export interface PhaseDeps {
  runner: Runner;
  env: Env;
  now: () => Date;
  memory?: PlanMemory;
}

// Chosen once per command: a joined spec writes the record, every other spec its files.
export function phaseWriterFor(projectDir: string, spec: SpecFolder, plans: PlanSource, deps: PhaseDeps, workflow?: LocalPilot): PhaseWriter {
  const files = fileWriter(projectDir, spec, deps, workflow);
  const joined = plans.joined(spec.name);
  if (!joined) return files;
  if (workflow) return refusingWriter(pilotJoinedRefusal(spec.name));
  return recordWriter(projectDir, spec, joined, files, deps);
}

export function refusingWriter(reason: string): PhaseWriter {
  const refuse = (): PhaseOutcome => ({ kind: "invalid", reason });
  return { tick: refuse, park: refuse, unpark: refuse, deployed: refuse, add: refuse, split: refuse, move: refuse, set: refuse };
}

// Keeps a file spec's answer synchronous; only a record write is awaited.
export function renderWritten(action: string, written: Written): string | Promise<string> {
  return written instanceof Promise ? written.then((outcome) => renderPhaseOutcome(action, outcome)) : renderPhaseOutcome(action, written);
}

export function renderPhaseOutcome(action: string, outcome: PhaseOutcome): string {
  const result = resultLine(action, outcome);
  return outcome.notice ? `${outcome.notice}\n${result}` : result;
}

function resultLine(action: string, outcome: PhaseOutcome): string {
  switch (outcome.kind) {
    case "landed":
    case "unchanged":
      return outcome.line;
    case "invalid":
      return `phase ${action}: ${outcome.reason}`;
    case "refused":
      return `${action}: refused, nothing written. ${outcome.reason}`;
    case "queued":
      return `${action}: kept on this machine (origin unreachable); ${outcome.pending} ${outcome.pending === 1 ? "change" : "changes"} not shared yet`;
  }
}
