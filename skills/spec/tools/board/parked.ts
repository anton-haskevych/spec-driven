import { phaseInFlightFile } from "../core/in-flight";
import { openPark, type ParkEntry } from "../core/park";
import type { SpecState } from "../core/spec-state";
import type { BoardInputs } from "./inputs";
import { rowKey } from "./phase-keys";

export interface ParkedPhase {
  spec: string;
  phase: string;
  park: ParkEntry;
}

// Phases waiting on an unanswered park entry, keyed by rowKey. A worktree's copy of a phase's
// in-flight note is newer than base's, so the first copy that has the note decides.
export function parkedPhases(inputs: Pick<BoardInputs, "states" | "workspaces">): Map<string, ParkedPhase> {
  const decided = new Set<string>();
  const parked = new Map<string, ParkedPhase>();
  for (const states of [...inputs.workspaces.map((workspace) => workspace.states), inputs.states]) {
    for (const [spec, state] of states) {
      for (const { phase, text } of phaseNotes(state)) {
        const key = rowKey({ spec, phase });
        if (decided.has(key)) continue;
        decided.add(key);
        const park = openPark(text);
        if (park) parked.set(key, { spec, phase, park });
      }
    }
  }
  return parked;
}

function phaseNotes(state: SpecState): { phase: string; text: string }[] {
  const notes = new Map((state.inFlight ?? []).map((note) => [note.file, note.text]));
  return state.phases.flatMap((phase) => {
    const text = notes.get(phaseInFlightFile(phase.id));
    return text === undefined ? [] : [{ phase: phase.id, text }];
  });
}
