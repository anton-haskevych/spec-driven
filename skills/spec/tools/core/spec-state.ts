import { join } from "node:path";
import { readTextIfExists } from "./files";
import { parseFrontmatter } from "./frontmatter";
import { parsePhaseEdges, type PhaseEdges } from "./phase-edges";
import { summarizePhaseEntry, type PhaseEntrySummary } from "./phase-entry";
import { parsePhaseTitle } from "./phase-title";
import { readSchedule, type Schedule } from "./schedule";
import { parsePhaseLines, type PhaseLine } from "./progress";
import type { SpecFolder } from "./spec-folders";

export interface PhaseState {
  id: string;
  name: string;
  done: boolean;
  deployed: boolean;
  pointer: string;
  edges: PhaseEdges;
  entry?: string;
  summary?: PhaseEntrySummary;
  schedule: Schedule;
}

export interface SpecState {
  spec: SpecFolder;
  hasProgress: boolean;
  phases: PhaseState[];
  inFlight?: string;
}

export function loadSpecState(spec: SpecFolder): SpecState {
  const progress = readTextIfExists(join(spec.dir, "progress.md"));
  const phases = parsePhaseLines(progress ?? "").map((line, index) => loadPhase(spec, line, index));
  return { spec, hasProgress: progress !== undefined, phases, inFlight: readTextIfExists(join(spec.dir, "in-flight.md")) };
}

function loadPhase(spec: SpecFolder, line: PhaseLine, index: number): PhaseState {
  const entry = readTextIfExists(join(spec.dir, line.pointer));
  const parsed = entry === undefined ? undefined : parseFrontmatter(entry);
  const data = parsed?.kind === "ok" ? parsed.data : undefined;
  const body = parsed?.kind === "ok" ? parsed.body : entry;
  return {
    ...parsePhaseTitle(line.title, String(index + 1)),
    done: line.done,
    deployed: line.deployed,
    pointer: line.pointer,
    edges: parsePhaseEdges(data),
    entry,
    summary: body === undefined ? undefined : summarizePhaseEntry(body),
    schedule: data ? readSchedule(data) : { problems: [] },
  };
}

export function firstOpenPhase(state: SpecState): PhaseState | undefined {
  return state.phases.find((phase) => !phase.done);
}
