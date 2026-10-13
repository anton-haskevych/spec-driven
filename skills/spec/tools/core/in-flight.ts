import { join } from "node:path";
import { existsSync } from "node:fs";
import { markdownFilesIn } from "./files";

// One file per phase, so two sessions on one spec never write the same file.
export const IN_FLIGHT_DIR = "in-flight";
export const LEGACY_IN_FLIGHT = "in-flight.md";

export interface InFlightNote {
  file: string;
  text: string;
}

interface InFlightOwner {
  id: string;
  edges: { pr?: string };
}

export function phaseInFlightFile(phaseId: string): string {
  return `${IN_FLIGHT_DIR}/phase-${phaseId}.md`;
}

export function groupInFlightFile(group: string): string {
  return `${IN_FLIGHT_DIR}/pr-${group}.md`;
}

export function readInFlight(read: (pathInSpec: string) => string | undefined, phases: readonly InFlightOwner[]): InFlightNote[] {
  const groups = [...new Set(phases.flatMap((phase) => (phase.edges.pr ? [phase.edges.pr] : [])))];
  const files = [...phases.map((phase) => phaseInFlightFile(phase.id)), ...groups.map(groupInFlightFile), LEGACY_IN_FLIGHT];
  return files.flatMap((file) => {
    const text = read(file);
    return text === undefined ? [] : [{ file, text }];
  });
}

export function notesForPhase(notes: readonly InFlightNote[], phaseId: string): InFlightNote[] {
  const wanted = new Set([phaseInFlightFile(phaseId), LEGACY_IN_FLIGHT]);
  return notes.filter((note) => wanted.has(note.file));
}

export function inFlightFilesIn(specDir: string): string[] {
  const perPhase = markdownFilesIn(join(specDir, IN_FLIGHT_DIR)).map((name) => `${IN_FLIGHT_DIR}/${name}`);
  return existsSync(join(specDir, LEGACY_IN_FLIGHT)) ? [...perPhase, LEGACY_IN_FLIGHT] : perPhase;
}
