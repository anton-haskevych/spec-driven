import { phaseInFlightFile, type InFlightNote } from "../core/in-flight";
import { withAnswer, withPark, type ParkEntry } from "../core/park";
import { questionsOn } from "../questions/on-phase";
import type { QuestionDoc } from "../questions/question-doc";
import type { JoinedPlan } from "./state-source";

// A joined spec's waiting questions read as each phase's `## Needs you` entries, after any its in-flight
// file holds, so every reader of parks (board, packs, crew) sees them unchanged: parks left on the phase
// document first, then its question documents.
export function withRecordQuestions(notes: readonly InFlightNote[], plan: JoinedPlan): InFlightNote[] {
  const merged = [...notes];
  for (const phase of plan.phases) {
    const entries = [...(phase.parks ?? []), ...questionsOn(plan, phase.id).map(parkOfQuestion)];
    if (entries.length === 0) continue;
    const file = phaseInFlightFile(phase.id);
    const at = merged.findIndex((note) => note.file === file);
    const text = entries.reduce((note: string | undefined, entry) => entryText(note, phase.id, entry), merged[at]?.text);
    if (text === undefined) continue;
    if (at === -1) merged.push({ file, text });
    else merged[at] = { file, text };
  }
  return merged;
}

function parkOfQuestion(doc: QuestionDoc): ParkEntry {
  return {
    parkedAt: doc.askedAt,
    question: doc.question,
    ...(doc.recommend ? { recommend: doc.recommend } : {}),
    ...(doc.answer ? { answer: { at: doc.answer.at, text: doc.answer.text } } : {}),
  };
}

function entryText(note: string | undefined, phaseId: string, entry: ParkEntry): string {
  const { answer, ...asked } = entry;
  const parked = withPark(note, phaseId, asked);
  return answer ? (withAnswer(parked, answer.text, answer.at) ?? parked) : parked;
}
