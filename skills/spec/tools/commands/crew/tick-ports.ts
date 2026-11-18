import { loadBoardInputs } from "../../board/load";
import { buildBoard } from "../../board/lanes";
import type { Result } from "../../core/result";
import { closeOut } from "../../crew/close-out-run";
import type { CrewDeps, RunFileStore } from "../../crew/deps";
import { questionRows } from "../../questions/list";
import { recordViewOf } from "../../record/read";
import type { LiveSession } from "../../sessions/live";
import { ownSessionId } from "../../sessions/own";
import { placeTree } from "../../trees/place";
import { placeDepsFor } from "../../trees/place-system";
import { systemPlaceDeps } from "../trees";
import { launchCrewSession } from "./launch-session";
import type { TickPorts } from "./tick";

export function systemTickPorts(projectDir: string, store: RunFileStore, deps: CrewDeps): TickPorts {
  return {
    async world() {
      const own = ownSessionId(deps.env);
      const inputs = await loadBoardInputs(projectDir, { local: false, ...(own ? { ownSessionId: own } : {}) }, deps);
      if (!inputs.ok) return inputs;
      const sessions: Result<LiveSession[]> = inputs.value.sessions === "local" ? { ok: false, reason: "sessions not read" } : inputs.value.sessions;
      const view = recordViewOf(inputs.value.plans.record);
      const questions = view ? questionRows(view) : [];
      return { ok: true, value: { sessions, claims: inputs.value.claims, ready: buildBoard(inputs.value, deps.now()).lanes.ready, states: inputs.value.states, questions } };
    },
    agents: () => deps.agents(),
    closeOut: (entry, agents, claims) => closeOut(entry, { agents, claims, claudeHome: deps.claudeHome, runner: deps.runner }),
    stop(id) {
      deps.runner.run(["claude", "stop", id]);
      deps.runner.run(["claude", "rm", id]);
    },
    launch: (request) => launchCrewSession(request, store, deps, (spec, phase, options) => placeTree({ spec, phase, ...options }, placeDepsFor(projectDir, systemPlaceDeps()))),
  };
}
