import type { PhaseDeps } from "../plan/phase-writer";
import type { LocalPilot } from "../runtime/workflow-capabilities";
import { ADD_USAGE, phaseAdd } from "./phase/add";
import { phaseContext, systemPhaseDeps, type PhaseContext } from "./phase/context";
import { DEPLOYED_USAGE, phaseDeployed } from "./phase/deployed";
import { PARK_USAGE, phasePark, phaseUnpark, UNPARK_USAGE } from "./phase/park";
import { MOVE_USAGE, phaseMove } from "./phase/move";
import { NOTE_USAGE, phaseNote } from "./phase/note";
import { phaseSet, SET_USAGE } from "./phase/set";
import { phaseSplit, SPLIT_USAGE } from "./phase/split";
import { phaseTask, TASK_USAGE } from "./phase/task";
import { phaseTick, TICK_USAGE } from "./phase/tick";

interface PhaseAction {
  usage: string;
  run(context: PhaseContext, args: readonly string[]): string | Promise<string>;
}

const ACTIONS: Record<string, PhaseAction> = {
  tick: { usage: TICK_USAGE, run: phaseTick },
  deployed: { usage: DEPLOYED_USAGE, run: phaseDeployed },
  add: { usage: ADD_USAGE, run: phaseAdd },
  park: { usage: PARK_USAGE, run: phasePark },
  unpark: { usage: UNPARK_USAGE, run: phaseUnpark },
  split: { usage: SPLIT_USAGE, run: phaseSplit },
  move: { usage: MOVE_USAGE, run: phaseMove },
  set: { usage: SET_USAGE, run: phaseSet },
  task: { usage: TASK_USAGE, run: phaseTask },
  note: { usage: NOTE_USAGE, run: phaseNote },
};

export const PHASE_ACTIONS = Object.keys(ACTIONS);

export const PHASE_USAGE = Object.values(ACTIONS)
  .map((action) => action.usage)
  .join(" | ");

export function phaseCommand(projectDir: string, args: readonly string[], workflow?: LocalPilot, deps: PhaseDeps = systemPhaseDeps()): string | Promise<string> {
  const [name = "", ...rest] = args;
  const action = Object.hasOwn(ACTIONS, name) ? ACTIONS[name] : undefined;
  return action ? action.run(phaseContext(projectDir, deps, workflow), rest) : `usage: ${PHASE_USAGE}`;
}
