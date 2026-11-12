import type { Env } from "../core/env";
import type { Runner } from "../core/run";
import type { SpecFolder } from "../core/spec-folders";
import type { AddRequest } from "../phases/add";
import type { DeployedRequest } from "../phases/deployed";
import type { ParkRequest, UnparkRequest } from "../phases/park";
import type { SplitRequest } from "../phases/split";
import type { TickRequest } from "../phases/tick";
import { pilotJoinedRefusal, type LocalPilot } from "../runtime/workflow-capabilities";
import { fileWriter } from "./file-writer";
import type { PlanSource } from "./read-plans";
import { recordWriter } from "./record-writer";

// `invalid`: the request can't be written anywhere (bad phase, missing evidence); `refused`: the record said
// no, or the save before it failed. Neither wrote anything.
export type PhaseOutcome =
  | { kind: "landed"; line: string }
  | { kind: "unchanged"; line: string }
  | { kind: "invalid"; reason: string }
  | { kind: "refused"; reason: string }
  | { kind: "queued"; pending: number };

export interface PhaseWriter {
  tick(request: TickRequest): PhaseOutcome | Promise<PhaseOutcome>;
  park(request: ParkRequest): PhaseOutcome;
  unpark(request: UnparkRequest): PhaseOutcome;
  deployed(request: DeployedRequest): PhaseOutcome;
  add(request: AddRequest): PhaseOutcome;
  split(request: SplitRequest): PhaseOutcome;
}

export interface PhaseDeps {
  runner: Runner;
  env: Env;
  now: () => Date;
}

// Chosen once per command: a joined spec writes the record, every other spec its files.
export function phaseWriterFor(projectDir: string, spec: SpecFolder, plans: PlanSource, deps: PhaseDeps, workflow?: LocalPilot): PhaseWriter {
  const files = fileWriter(projectDir, spec, deps, workflow);
  const joined = plans.joined(spec.name);
  if (!joined) return files;
  if (workflow) return refusingWriter(pilotJoinedRefusal(spec.name));
  return recordWriter(projectDir, spec.name, joined, files, deps);
}

export function refusingWriter(reason: string): PhaseWriter {
  const refuse = (): PhaseOutcome => ({ kind: "invalid", reason });
  return { tick: refuse, park: refuse, unpark: refuse, deployed: refuse, add: refuse, split: refuse };
}

export function renderPhaseOutcome(action: string, outcome: PhaseOutcome): string {
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
