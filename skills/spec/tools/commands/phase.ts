import { systemRunner } from "../core/run";
import { readLocalPlans } from "../plan/read-plans";
import type { LocalPilot } from "../runtime/workflow-capabilities";
import { ADD_USAGE, phaseAdd } from "./phase/add";
import { DEPLOYED_USAGE, phaseDeployed } from "./phase/deployed";
import { PARK_USAGE, phasePark, phaseUnpark, UNPARK_USAGE } from "./phase/park";
import { phaseSplit, SPLIT_USAGE } from "./phase/split";
import { phaseTick, TICK_USAGE } from "./phase/tick";

interface PhaseAction {
  usage: string;
  run(projectDir: string, args: readonly string[], workflow?: LocalPilot): string | Promise<string>;
}

const ACTIONS: Record<string, PhaseAction> = {
  tick: { usage: TICK_USAGE, run: phaseTick },
  deployed: { usage: DEPLOYED_USAGE, run: phaseDeployed },
  add: { usage: ADD_USAGE, run: phaseAdd },
  park: { usage: PARK_USAGE, run: phasePark },
  unpark: { usage: UNPARK_USAGE, run: phaseUnpark },
  split: { usage: SPLIT_USAGE, run: phaseSplit },
};

export const PHASE_USAGE = Object.values(ACTIONS)
  .map((action) => action.usage)
  .join(" | ");

export function phaseCommand(projectDir: string, args: readonly string[], workflow?: LocalPilot): string | Promise<string> {
  const [name = "", ...rest] = args;
  const action = Object.hasOwn(ACTIONS, name) ? ACTIONS[name] : undefined;
  if (!action) return `usage: ${PHASE_USAGE}`;
  return (PLAN_WRITERS.has(name) ? joinedRefusal(projectDir, name, rest[0], workflow) : undefined) ?? action.run(projectDir, rest, workflow);
}

// Park and unpark write only in-flight notes, which stay files.
const PLAN_WRITERS = new Set(["tick", "deployed", "add", "split"]);

// Until phase 3 gives the planners a record path, a write to a joined spec's frozen files would be lost.
function joinedRefusal(projectDir: string, action: string, spec: string | undefined, workflow: LocalPilot | undefined): string | undefined {
  if (spec === undefined || spec.startsWith("-")) return undefined;
  if (!readLocalPlans(projectDir, systemRunner, new Date()).isJoined(spec)) return undefined;
  return `phase ${action}: ${spec} is on the board; ${workflow ? "a Codex pilot" : "this version"} can't write it yet`;
}
