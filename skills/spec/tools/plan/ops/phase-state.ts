import { allTasksDone, countTasks } from "../../core/phase-entry";
import type { ParkEntry } from "../../core/park";
import type { PhaseDoc } from "../docs/phase-doc";
import type { Edit, PhaseStateChange } from "./change";

export interface DeployedIntent {
  spec: string;
  phase: string;
  day: string;
}

export interface ParkIntent {
  spec: string;
  phase: string;
  question: string;
  recommend?: string;
  at: string;
}

export interface UnparkIntent {
  spec: string;
  phase: string;
  answer: string;
  at: string;
}

export function deployedEdit(intent: DeployedIntent): (phase: PhaseDoc) => Edit<PhaseStateChange> {
  return (phase) => {
    if (!allTasksDone(countTasks(phase.tasks))) return { refused: `Phase ${phase.id} is not ticked; only a finished phase can be deployed` };
    if (phase.deployed) return { unchanged: `Phase ${phase.id} is already marked deployed` };
    return { phase: { ...phase, deployed: intent.day }, line: `Phase ${phase.id} marked deployed ${intent.day}` };
  };
}

export function parkEdit(intent: ParkIntent): (phase: PhaseDoc) => Edit<PhaseStateChange> {
  return (phase) => {
    if (phase.deployed || allTasksDone(countTasks(phase.tasks))) return { refused: `Phase ${phase.id} is done; nothing to park` };
    const open = openRecordPark(phase);
    if (open) return { refused: `Phase ${phase.id} is already parked on "${open.question}"; ask both in one question` };
    const park: ParkEntry = { parkedAt: intent.at, question: oneLine(intent.question), ...(intent.recommend?.trim() ? { recommend: oneLine(intent.recommend) } : {}) };
    const advice = park.recommend ? ` · recommend: ${park.recommend}` : "";
    return { phase: { ...phase, parks: [...(phase.parks ?? []), park] }, line: `parked Phase ${phase.id} on the board: "${park.question}"${advice}\nHand off; the board shows the question.` };
  };
}

export function unparkEdit(intent: UnparkIntent): (phase: PhaseDoc) => Edit<PhaseStateChange> {
  return (phase) => {
    const parks = phase.parks ?? [];
    const open = parks.findIndex((park) => park.answer === undefined);
    if (open === -1) return { refused: `Phase ${phase.id} is not parked` };
    const answer = oneLine(intent.answer);
    const answered = parks.map((park, index) => (index === open ? { ...park, answer: { at: intent.at, text: answer } } : park));
    return { phase: { ...phase, parks: answered }, line: `answered Phase ${phase.id}: "${answer}"` };
  };
}

export function openRecordPark(phase: PhaseDoc): ParkEntry | undefined {
  return phase.parks?.find((park) => park.answer === undefined);
}

export function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
