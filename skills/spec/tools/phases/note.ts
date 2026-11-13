import { join } from "node:path";
import type { EditPlan } from "../core/apply-edits";
import { noteFileText } from "../core/handoff-note";
import { phaseInFlightFile } from "../core/in-flight";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, loadSpecStateFromFiles } from "../core/spec-state";
import { findPhase } from "./find-phase";

// `note` absent clears the phase's note.
export interface NoteRequest {
  phase: string;
  note?: string;
  at: string;
}

export interface Note {
  plan: EditPlan;
  phaseId?: string;
  file?: string;
}

// The note overwrites the phase's in-flight file and keeps its `## Needs you`; a cleared note removes the file
// unless questions are left in it.
export function planNote(spec: SpecFolder, request: NoteRequest): Note {
  const phase = findPhase(loadSpecStateFromFiles(spec), request.phase);
  if (typeof phase === "string") return { plan: { kind: "invalid", reason: phase } };
  const file = phaseInFlightFile(phase.id);
  const previous = diskReader(spec.dir)(file);
  const text = noteFileText(request.note, previous, phase.id);
  if (text === previous) return { plan: { kind: "unchanged", reason: `note: phase ${phase.id} · ${file} already says that` }, phaseId: phase.id, file };
  const path = join(spec.dir, file);
  const plan: EditPlan = text === undefined ? { kind: "ok", edits: [], removes: [path] } : { kind: "ok", edits: [{ file: path, text }] };
  return { plan, phaseId: phase.id, file };
}
