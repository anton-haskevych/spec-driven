import { loadBoardInputs } from "../../board/load";
import { buildBoard } from "../../board/lanes";
import type { Result } from "../../core/result";
import { closeOut } from "../../crew/close-out-run";
import type { CrewDeps, RunFileStore } from "../../crew/deps";
import { openSpecRuns } from "../../crew/scope";
import { planShapeOf } from "../../plan/plan-diff";
import { noticePlanChange, planMemoryFor } from "../../plan/plan-version";
import type { PlanSource } from "../../plan/read-plans";
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
    async world(spec) {
      const own = ownSessionId(deps.env);
      const inputs = await loadBoardInputs(projectDir, { local: false, ...(own ? { ownSessionId: own } : {}) }, deps);
      if (!inputs.ok) return inputs;
      const sessions: Result<LiveSession[]> = inputs.value.sessions === "local" ? { ok: false, reason: "sessions not read" } : inputs.value.sessions;
      const view = recordViewOf(inputs.value.plans.record);
      const questions = view ? questionRows(view) : [];
      const planChange = spec === undefined ? undefined : planChangeOf(spec, inputs.value.plans, deps);
      return { ok: true, value: { sessions, claims: inputs.value.claims, ready: buildBoard(inputs.value, deps.now()).lanes.ready, states: inputs.value.states, questions, ...(planChange ? { planChange } : {}) } };
    },
    overseen: () => openSpecRuns(projectDir, deps.runner),
    agents: () => deps.agents(),
    closeOut: (entry, agents, claims) => closeOut(entry, { agents, claims, claudeHome: deps.claudeHome, runner: deps.runner }),
    stop(id) {
      deps.runner.run(["claude", "stop", id]);
      deps.runner.run(["claude", "rm", id]);
    },
    launch: (request) => launchCrewSession(request, store, deps, (spec, phase, options) => placeTree({ spec, phase, ...options }, placeDepsFor(projectDir, systemPlaceDeps()))),
  };
}

function planChangeOf(spec: string, plans: PlanSource, deps: CrewDeps): string | undefined {
  const memory = planMemoryFor(deps.env);
  const joined = plans.joined(spec);
  return memory && joined ? noticePlanChange(memory, spec, planShapeOf(joined)) : undefined;
}
