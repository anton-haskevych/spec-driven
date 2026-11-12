import { isGateItem } from "../core/gate";
import { RECORD_LAYOUT } from "../record/layout";
import { readPhaseDoc, type PhaseDoc, type Task } from "./docs/phase-doc";
import type { SpecDoc } from "./docs/spec-doc";
import { specPlanProblems } from "./docs/spec-plan";

export interface ApplyStamp {
  joinedAt: string;
  joinedFrom: string;
}

export type AppliedPlan = { spec: SpecDoc; phases: PhaseDoc[] } | { problems: string[] };

// A draft phase is a phase document whose tasks are plain texts: the tool gives them ids, so a draft
// can't reuse or collide one.
export function planApply(spec: string, draft: unknown, stamp: ApplyStamp): AppliedPlan {
  const drafted = draftPhases(draft);
  if ("problems" in drafted) return drafted;
  const read = drafted.phases.map(phaseFromDraft);
  const problems = read.flatMap((phase) => phase.problems);
  const phases = read.flatMap((phase) => (phase.doc ? [phase.doc] : []));
  const ids = phases.map((phase) => phase.id);
  problems.push(...[...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].map((id) => `phase id ${id} appears twice`));
  if (problems.length > 0) return { problems };
  const specDoc: SpecDoc = { name: spec, planVersion: 1, phases: ids, ...stamp, layout: RECORD_LAYOUT };
  const planProblems = specPlanProblems(specDoc, phases);
  return planProblems.length > 0 ? { problems: planProblems } : { spec: specDoc, phases };
}

function draftPhases(draft: unknown): { phases: unknown[] } | { problems: string[] } {
  const phases = typeof draft === "object" && draft !== null && !Array.isArray(draft) ? (draft as { phases?: unknown }).phases : undefined;
  if (!Array.isArray(phases)) return { problems: ["the draft must be an object with a phases list"] };
  return phases.length === 0 ? { problems: ["the draft has no phases"] } : { phases };
}

function phaseFromDraft(value: unknown, index: number): { doc?: PhaseDoc; problems: string[] } {
  const fields = typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const id = typeof fields.id === "string" && fields.id !== "" ? fields.id : `#${index + 1}`;
  const texts = fields.tasks ?? [];
  if (!Array.isArray(texts) || texts.some((text) => typeof text !== "string")) return { problems: [`phase ${id}: tasks must be a list of task texts`] };
  const tasks = texts.map((text: string, at): Task => ({ id: `${id}.${at + 1}`, text, done: false, ...(isGateItem(text) ? { gate: true } : {}) }));
  const read = readPhaseDoc({ outcome: "", code: true, ...fields, tasks });
  return read.doc ? { doc: read.doc, problems: [] } : { problems: read.problems.map((problem) => `phase ${id}: ${problem}`) };
}
