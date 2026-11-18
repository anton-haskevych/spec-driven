import type { TickPorts, TickWorld } from "../commands/crew/tick";
import type { CloseOut } from "../crew/close-out";
import { newRunFile, withLaunched, type LaunchedEntry } from "../crew/run-state";
import type { Agent } from "../sessions/agents";
import { liveSession } from "./factories";
import { createTree, type Tree } from "./tree";

export const OWN = "48777164-0d07-4950-a27e-f5187ba29739";
export const env = { CLAUDE_CODE_SESSION_ID: OWN };

export const agent = (id: string, state: Agent["state"], name?: string): Agent => ({ id, sessionId: `${id}-0`, cwd: `/trees/${id}`, kind: "background", state, ...(name ? { name } : {}) });

export interface RunSetup {
  spec?: string;
  launched?: LaunchedEntry[];
  workers?: number;
  overseer?: string;
}

// A checkout with no git: run files live under `<root>/.git/spec-board/crew/`.
export function crewTree(): Tree & { run(setup?: RunSetup): string } {
  const tree = createTree("crew-tick-");
  const run = ({ spec, launched = [], workers = 1, overseer = OWN }: RunSetup = {}) =>
    tree.write(`.git/spec-board/crew/${spec ? `run-${spec}.md` : "run.md"}`, withLaunched(newRunFile({ ...(spec ? { spec } : {}), overseer, runner: "anton-haskevych", started: "2026-10-12T20:00:00-07:00", caps: { workers, babysitters: 1 } }), launched));
  return { ...tree, run };
}

export function tickPorts(world: Partial<TickWorld>, agents: Agent[], verdicts: Record<string, CloseOut> = {}) {
  const calls = { stopped: [] as string[], launched: [] as string[], requests: [] as Array<{ machineBusy?: number; relaunch?: true }> };
  const fake: TickPorts = {
    world: async () => ({ ok: true, value: { sessions: { ok: true, value: [liveSession({ sessionId: OWN })] }, claims: [], ready: [], states: new Map(), ...world } }),
    agents: () => ({ ok: true, value: agents }),
    closeOut: (entry) => verdicts[entry.id],
    stop: (id) => void calls.stopped.push(id),
    launch: async (request) => {
      calls.launched.push(`${request.spec} ${request.target}`);
      calls.requests.push({ ...(request.machineBusy === undefined ? {} : { machineBusy: request.machineBusy }), ...(request.relaunch ? { relaunch: request.relaunch } : {}) });
      const id = `n${calls.launched.length}`;
      return { text: `Launched: background ${id} · ${request.spec} execute ${request.target}`, launched: { id, title: `${request.spec} execute ${request.target}`, at: "t" } };
    },
  };
  return { fake, calls };
}
