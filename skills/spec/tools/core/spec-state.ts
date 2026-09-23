import { join } from "node:path";
import { readTextIfExists } from "./files";
import { summarizePhaseEntry, type PhaseEntrySummary } from "./phase-entry";
import { parsePhaseTitle } from "./phase-title";
import { parsePhaseLines } from "./progress";
import type { SpecFolder } from "./spec-folders";

export interface PhaseState {
  id: string;
  name: string;
  done: boolean;
  pointer: string;
  entry?: string;
  summary?: PhaseEntrySummary;
}

export interface SpecState {
  spec: SpecFolder;
  hasProgress: boolean;
  phases: PhaseState[];
  inFlight?: string;
}

export function loadSpecState(spec: SpecFolder): SpecState {
  const progress = readTextIfExists(join(spec.dir, "progress.md"));
  const phases = parsePhaseLines(progress ?? "").map((line, index) => {
    const entry = readTextIfExists(join(spec.dir, line.pointer));
    const title = parsePhaseTitle(line.title, String(index + 1));
    return { ...title, done: line.done, pointer: line.pointer, entry, summary: entry ? summarizePhaseEntry(entry) : undefined };
  });
  return { spec, hasProgress: progress !== undefined, phases, inFlight: readTextIfExists(join(spec.dir, "in-flight.md")) };
}

export function firstOpenPhase(state: SpecState): PhaseState | undefined {
  return state.phases.find((phase) => !phase.done);
}
