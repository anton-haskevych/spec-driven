import { join } from "node:path";
import { readTextIfExists } from "./files";
import { parseFrontmatter, stringField } from "./frontmatter";
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
  code: boolean;
  playbook?: string;
}

export interface SpecState {
  spec: SpecFolder;
  hasProgress: boolean;
  phases: PhaseState[];
  inFlight?: string;
}

export type ReadSpecFile = (pathInSpec: string) => string | undefined;

export function loadSpecState(spec: SpecFolder): SpecState {
  return specStateFrom(spec, (pathInSpec) => readTextIfExists(join(spec.dir, pathInSpec)));
}

export function specStateFrom(spec: SpecFolder, read: ReadSpecFile): SpecState {
  const progress = read("progress.md");
  const phases = parsePhaseLines(progress ?? "").map((line, index) => loadPhase(read, line, index));
  return { spec, hasProgress: progress !== undefined, phases, inFlight: read("in-flight.md") };
}

function loadPhase(read: ReadSpecFile, line: PhaseLine, index: number): PhaseState {
  const entry = read(line.pointer);
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
    code: data?.code !== false,
    playbook: data ? stringField(data, "playbook") : undefined,
  };
}

export function firstOpenPhase(state: SpecState): PhaseState | undefined {
  return state.phases.find((phase) => !phase.done);
}
