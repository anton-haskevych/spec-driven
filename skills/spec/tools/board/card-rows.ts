import { cardAttention, type CardAttention, type CoveredPhase } from "../cards/attention";
import { readCards } from "../cards/read";
import { prGroupOf } from "../plan/docs/pr-doc";
import { phaseStage } from "../plan/phase-stage";
import { recordViewOf } from "../record/read";
import type { BoardInputs } from "./inputs";

const FINISHED = new Set(["merged", "deployed", "done"]);

export function cardRows(inputs: Pick<BoardInputs, "plans" | "prDocs" | "nodes">): CardAttention[] {
  const view = recordViewOf(inputs.plans.record);
  return view ? cardAttention(readCards(view), (spec) => coveredPhasesOf(inputs, spec)) : [];
}

// A joined phase by its stage; a phase in files by its mark on the default branch, where a tick lands at merge.
export function coveredPhasesOf(inputs: Pick<BoardInputs, "plans" | "prDocs" | "nodes">, spec: string): CoveredPhase[] | undefined {
  const joined = inputs.plans.joined(spec);
  if (!joined) return inputs.nodes.get(spec)?.phases.map((mark) => ({ id: mark.id, stage: mark.done ? "merged" : "open", finished: mark.done }));
  const docs = inputs.prDocs.get(spec);
  return joined.phases.map((phase) => {
    const stage = phaseStage(phase, docs?.find((doc) => doc.group === prGroupOf(phase)), false);
    return { id: phase.id, stage, finished: FINISHED.has(stage) };
  });
}
