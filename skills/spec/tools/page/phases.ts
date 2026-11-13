import { coveredPhasesOf } from "../board/card-rows";
import type { BoardInputs } from "../board/inputs";
import type { Board } from "../board/model";
import { coveredPhases } from "../cards/attention";
import type { PagePhase, Square } from "./model";

const LIVE = new Set(["merged", "deployed", "done"]);

// The phases one cover ref names, with their titles and squares; a phase in flight on the board is doing.
export function phasesOf(inputs: Pick<BoardInputs, "plans" | "prDocs" | "nodes" | "states">, board: Pick<Board, "lanes">): (ref: string) => PagePhase[] {
  const inFlight = new Set(board.lanes.inFlight.map((row) => `${row.spec}#${row.phase}`));
  return (ref) =>
    coveredPhases(ref, (spec) => coveredPhasesOf(inputs, spec)).map(({ spec, phase }) => {
      const title = titleOf(inputs, spec, phase.id);
      return { spec, id: phase.id, ...(title ? { title } : {}), stage: phase.stage, square: squareOf(phase.stage, inFlight.has(`${spec}#${phase.id}`)) };
    });
}

function titleOf(inputs: Pick<BoardInputs, "plans" | "states">, spec: string, phase: string): string | undefined {
  const joined = inputs.plans.joined(spec)?.phases.find((each) => each.id === phase);
  return joined?.title ?? inputs.states.get(spec)?.phases.find((each) => each.id === phase)?.name;
}

export function squareOf(stage: string, inFlight: boolean): Square {
  if (LIVE.has(stage)) return "live";
  if (stage === "built") return "built";
  return stage === "doing" || inFlight ? "doing" : "todo";
}
