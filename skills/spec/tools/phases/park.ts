import { join } from "node:path";
import type { EditPlan } from "../core/apply-edits";
import { phaseInFlightFile } from "../core/in-flight";
import { openPark, withAnswer, withPark } from "../core/park";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, loadSpecState } from "../core/spec-state";
import { findPhase } from "./find-phase";

export interface ParkRequest {
  phase: string;
  question: string;
  recommend?: string;
  at: string;
}

export interface UnparkRequest {
  phase: string;
  answer: string;
  at: string;
}

export interface Park {
  plan: EditPlan;
  phaseId?: string;
  file?: string;
}

export function planPark(spec: SpecFolder, request: ParkRequest): Park {
  const found = located(spec, request.phase);
  if (found.kind === "invalid") return { plan: found };
  const { phase, text } = found;
  if (phase.done) return invalidPlan(`Phase ${phase.id} is done; nothing to park`);
  const open = text === undefined ? undefined : openPark(text);
  if (open) return invalidPlan(`Phase ${phase.id} is already parked on "${open.question}"; ask both in one question`);
  const entry = { parkedAt: request.at, question: oneLine(request.question), ...(request.recommend ? { recommend: oneLine(request.recommend) } : {}) };
  return planWrite(spec, phase.id, withPark(text, phase.id, entry));
}

export function planUnpark(spec: SpecFolder, request: UnparkRequest): Park {
  const found = located(spec, request.phase);
  if (found.kind === "invalid") return { plan: found };
  const answered = found.text === undefined ? undefined : withAnswer(found.text, oneLine(request.answer), request.at);
  if (answered === undefined) return invalidPlan(`Phase ${found.phase.id} is not parked`);
  return planWrite(spec, found.phase.id, answered);
}

function located(spec: SpecFolder, rawPhase: string) {
  const phase = findPhase(loadSpecState(spec), rawPhase);
  if (typeof phase === "string") return { kind: "invalid" as const, reason: phase };
  return { kind: "found" as const, phase, text: diskReader(spec.dir)(phaseInFlightFile(phase.id)) };
}

function planWrite(spec: SpecFolder, phaseId: string, text: string): Park {
  const file = phaseInFlightFile(phaseId);
  return { plan: { kind: "ok", edits: [{ file: join(spec.dir, file), text }] }, phaseId, file };
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function invalidPlan(reason: string): Park {
  return { plan: { kind: "invalid", reason } };
}
