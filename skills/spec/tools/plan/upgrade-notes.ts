import { noteBody } from "../core/handoff-note";
import { phaseInFlightFile } from "../core/in-flight";
import { parkEntries, type ParkEntry } from "../core/park";
import { nextGateTask } from "../questions/plans";
import { aboutPhase, nextQuestionId, type QuestionDoc } from "../questions/question-doc";
import type { RecordOp } from "../record/plan-writes";
import type { PhaseDoc } from "./docs/phase-doc";
import { phaseDocPath, questionDocPath } from "./kinds";
import type { JoinedPlan } from "./state-source";

// What layout 3 copies from a spec's files: each phase's in-flight note, split into the hand-off note and
// its parked questions.
export interface NotesFromFiles {
  notes: Record<string, string>;
  parks: Record<string, ParkEntry[]>;
}

// Who asked and who answered a question parked before layout 3 isn't written anywhere.
const UNKNOWN = "unknown";

export function notesFromFiles(read: (pathInSpec: string) => string | undefined, phases: readonly Pick<PhaseDoc, "id">[]): NotesFromFiles {
  const notes: Record<string, string> = {};
  const parks: Record<string, ParkEntry[]> = {};
  for (const { id } of phases) {
    const text = read(phaseInFlightFile(id));
    if (text === undefined) continue;
    const note = noteBody(text);
    if (note !== "") notes[id] = note;
    const entries = parkEntries(text);
    if (entries.length > 0) parks[id] = entries;
  }
  return { notes, parks };
}

// Planned at the tip: a note already on a phase document stays; every park, on the phase document or in its
// file, becomes a question document, and the document's `parks` goes.
export function notesStep(plan: JoinedPlan, copied: NotesFromFiles, at: string): { phases: PhaseDoc[]; questions: QuestionDoc[] } {
  const questions: QuestionDoc[] = [];
  const asked = () => [...(plan.questions ?? []), ...questions];
  const phases = plan.phases.map((phase) => {
    for (const park of parksOf(phase, copied.parks[phase.id] ?? [])) questions.push(questionOfPark(plan.spec.name, phase, park, nextQuestionId(asked())));
    const { parks: _moved, ...rest } = phase;
    const note = copied.notes[phase.id];
    return phase.handoff || note === undefined ? rest : { ...rest, handoff: { at, by: UNKNOWN, note } };
  });
  return { phases, questions };
}

export function notesStepOps(plan: JoinedPlan, copied: NotesFromFiles, at: string): RecordOp[] {
  const { phases, questions } = notesStep(plan, copied, at);
  const changed = phases.filter((phase, index) => JSON.stringify(phase) !== JSON.stringify(plan.phases[index]));
  return [
    ...changed.map((phase): RecordOp => ({ op: "update", path: phaseDocPath(plan.spec.name, phase.id), patch: { parks: null, ...(phase.handoff ? { handoff: phase.handoff } : {}) } })),
    ...questions.map((doc): RecordOp => ({ op: "create", path: questionDocPath(plan.spec.name, doc.id), doc })),
  ];
}

function parksOf(phase: PhaseDoc, fromFile: readonly ParkEntry[]): ParkEntry[] {
  const onRecord = phase.parks ?? [];
  const same = (a: ParkEntry, b: ParkEntry) => a.parkedAt === b.parkedAt && a.question === b.question;
  return [...onRecord, ...fromFile.filter((park) => !onRecord.some((each) => same(each, park)))];
}

function questionOfPark(spec: string, phase: PhaseDoc, park: ParkEntry, id: string): QuestionDoc {
  const gate = park.answer ? undefined : nextGateTask(phase);
  return {
    id,
    about: aboutPhase(spec, phase.id, gate),
    kind: gate ? "gate" : "question",
    askedAt: park.parkedAt,
    askedBy: UNKNOWN,
    question: park.question,
    ...(park.recommend ? { recommend: park.recommend } : {}),
    ...(park.answer ? { answer: { text: park.answer.text, by: UNKNOWN, at: park.answer.at } } : {}),
  };
}
