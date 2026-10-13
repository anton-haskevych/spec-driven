import { CREW_WAIT_USAGE, crewWait } from "./crew/wait";
import { CREW_OVERSEER_USAGE, CREW_START_USAGE, crewOverseer, crewStart } from "./crew/overseer";

interface CrewAction {
  usage: string;
  run(projectDir: string, args: readonly string[]): string | Promise<string>;
}

const ACTIONS: Record<string, CrewAction> = {
  overseer: { usage: CREW_OVERSEER_USAGE, run: (dir, args) => crewOverseer(dir, args) },
  start: { usage: CREW_START_USAGE, run: (dir, args) => crewStart(dir, args) },
  wait: { usage: CREW_WAIT_USAGE, run: (dir, args) => crewWait(dir, args) },
};

export const CREW_USAGE = Object.values(ACTIONS)
  .map((action) => action.usage)
  .join(" | ");

export function crewCommand(projectDir: string, args: readonly string[]): string | Promise<string> {
  const [name, ...rest] = args;
  const action = name !== undefined && Object.hasOwn(ACTIONS, name) ? ACTIONS[name] : undefined;
  return action ? action.run(projectDir, rest) : `usage: ${CREW_USAGE}`;
}
