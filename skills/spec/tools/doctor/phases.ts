import { countCheckboxes, type PhaseLine } from "../core/progress";
import { error, warning, type Issue } from "./issue";

export type ReadPhaseEntry = (pointer: string) => string | undefined;

const TITLE_END = /\s*(→|->|phases\/).*$/;
const HEADING_OR_BLANK = /^\s*(#.*)?$/;

export function checkPhases(progressFile: string, phases: readonly PhaseLine[], readEntry: ReadPhaseEntry): Issue[] {
  return phases.flatMap((phase) => checkPhase(progressFile, phase, readEntry(phase.pointer)));
}

function checkPhase(progressFile: string, phase: PhaseLine, entry: string | undefined): Issue[] {
  const title = phase.title.replace(TITLE_END, "");
  if (entry === undefined) return [error(progressFile, `"${title}" points at ${phase.pointer}, which does not exist`)];

  const boxes = countCheckboxes(entry);
  if (phase.done && boxes.unchecked > 0) {
    return [warning(progressFile, `"${title}" is ticked but ${boxes.unchecked} sub-items in ${phase.pointer} are not`)];
  }
  if (!phase.done && boxes.checked > 0 && boxes.unchecked === 0) {
    return [warning(progressFile, `"${title}" has every sub-item ticked in ${phase.pointer}; tick the phase`)];
  }
  return [];
}

export function checkInFlight(file: string, text: string, everyPhaseDone: boolean): Issue[] {
  if (!everyPhaseDone) return [];
  const pending = text.split("\n").some((line) => !HEADING_OR_BLANK.test(line));
  return pending ? [warning(file, "has pending notes but every phase is done; clear it or reopen a phase")] : [];
}
