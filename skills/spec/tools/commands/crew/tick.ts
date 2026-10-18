import type { ReadyRow } from "../../board/model";
import { loadBoardInputs } from "../../board/load";
import { buildBoard } from "../../board/lanes";
import type { HeldClaim } from "../../claims/rules";
import type { Result } from "../../core/result";
import { isoTimestamp } from "../../core/schedule";
import type { SpecState } from "../../core/spec-state";
import type { CloseOut } from "../../crew/close-out";
import { claimFor, closeOut, isClaimLive } from "../../crew/close-out-run";
import { runFileStore, systemCrewDeps, type CrewDeps, type RunFileStore } from "../../crew/deps";
import { overseerLine, whoseRun } from "../../crew/overseer";
import { pickRows } from "../../crew/pick";
import { parseRunFile, withLaunched, withLog, withOverseer, type LaunchedEntry, type RunFile } from "../../crew/run-state";
import { actionLines, afterCloseOut, nextAction } from "../../crew/tick-step";
import { parseLaunchTitle } from "../../launch/title";
import { loadAgents, type Agent } from "../../sessions/agents";
import type { LiveSession } from "../../sessions/live";
import { ownSessionId } from "../../sessions/own";
import { placeTree } from "../../trees/place";
import { systemPlaceDeps } from "../trees";
import { launchCrewSession, type CrewLaunchRequest, type CrewLaunchResult } from "./launch-session";

export const CREW_TICK_USAGE = "crew tick [--no-launch]";
const NO_RUNNER = "crew tick: can't tell who runs this crew; run crew start again. Launching nothing";

export interface TickWorld {
  sessions: Result<LiveSession[]>;
  claims: readonly HeldClaim[];
  ready: readonly ReadyRow[];
  states: ReadonlyMap<string, SpecState>;
}

export interface TickPorts {
  world(): Promise<Result<TickWorld>>;
  agents(): Result<Agent[]>;
  closeOut(entry: LaunchedEntry, agents: readonly Agent[], claims: readonly HeldClaim[]): CloseOut | undefined;
  // `claude rm` keeps the transcript and the worktree: tick never removes a tree.
  stop(id: string): void;
  launch(request: CrewLaunchRequest): Promise<CrewLaunchResult>;
}

interface Report {
  done: string[];
  forYou: string[];
}

export async function crewTick(projectDir: string, args: readonly string[], deps: CrewDeps = systemCrewDeps(), overrides: Partial<TickPorts> = {}): Promise<string> {
  if (args.some((arg) => arg !== "--no-launch")) return `usage: ${CREW_TICK_USAGE}`;
  const store = runFileStore(projectDir, deps.runner);
  if (!store.ok) return `crew tick: ${store.reason}`;
  const ports = { ...systemTickPorts(projectDir, store.value, deps), ...overrides };
  let text = store.value.read();
  if (text === undefined) return "crew tick: no run.md yet; run crew start first";
  const world = await ports.world();
  if (!world.ok) return `crew tick: ${world.reason}`;
  if (!world.value.sessions.ok) return `crew tick: can't read sessions (${world.value.sessions.reason}); acting on nothing`;
  const own = ownSessionId(deps.env);
  const run = parseRunFile(text);
  const verdict = whoseRun(run.overseer, world.value.sessions.value, own);
  if (verdict.kind === "other") return overseerLine(verdict);
  const agents = ports.agents();
  if (!agents.ok) return `crew tick: ${agents.reason}`;

  const report: Report = { done: verdict.kind === "take-over" ? [overseerLine(verdict)] : [], forYou: [] };
  if (own && run.overseer !== own) text = withOverseer(text, own);
  const passed = closeOutLaunched(run.launched, agents.value, world.value.claims, ports, isoTimestamp(deps.now()), report);
  const remaining = run.launched.filter((entry) => !passed.removed.has(entry.id));
  store.value.write(withLog(withLaunched(text, remaining), passed.logs));

  // Pausing (or a stood-down run) closes sessions out but never starts new ones; neither does a run
  // that doesn't say whose it is, since every pick and launch is offered to the runner.
  const { runner } = run;
  const held = args.includes("--no-launch") || run.state === "stood-down" ? "pausing" : runner === undefined ? "no runner" : undefined;
  if (held === "no runner") report.forYou.push(NO_RUNNER);
  if (held) report.forYou.push(...passed.relaunches.map((relaunch) => `Relaunch held (${held}): ${relaunch.spec} ${relaunch.phase}`));
  const launched = held || runner === undefined ? 0 : await fillSlots(remaining, agents.value, passed.relaunches, world.value, { ...run, runner }, ports, report);
  return [...report.done, ...report.forYou, `Tick: ${passed.removed.size} closed out · ${launched} launched · ${report.forYou.length} for you`].join("\n");
}

interface ClosedOut {
  removed: Set<string>;
  logs: string[];
  relaunches: Array<{ spec: string; phase: string }>;
}

function closeOutLaunched(launched: readonly LaunchedEntry[], agents: readonly Agent[], claims: readonly HeldClaim[], ports: TickPorts, at: string, report: Report): ClosedOut {
  const passed: ClosedOut = { removed: new Set(), logs: [], relaunches: [] };
  for (const entry of launched) {
    const title = parseLaunchTitle(entry.title);
    if (!title) continue;
    const agent = agents.find((candidate) => candidate.id === entry.id);
    const action = nextAction(title, agent, isClaimLive(claimFor(title, claims)));
    report.forYou.push(...actionLines(entry, action));
    const checked = action.kind === "close-out" ? ports.closeOut(entry, agents, claims) : undefined;
    if (!checked) continue;
    const outcome = afterCloseOut(entry, title, checked, agent === undefined, at);
    if (outcome.remove) {
      ports.stop(entry.id);
      passed.removed.add(entry.id);
      report.done.push(outcome.lines[0] ?? `Closed out ${entry.title}`);
      report.forYou.push(...outcome.lines.slice(1));
    } else report.forYou.push(...outcome.lines);
    if (outcome.log) passed.logs.push(outcome.log);
    if (outcome.relaunch) passed.relaunches.push(outcome.relaunch);
  }
  return passed;
}

async function fillSlots(remaining: readonly LaunchedEntry[], agents: readonly Agent[], relaunches: ReadonlyArray<{ spec: string; phase: string }>, world: TickWorld, run: RunFile & { runner: string }, ports: TickPorts, report: Report): Promise<number> {
  const workers = remaining.flatMap((entry) => {
    const title = parseLaunchTitle(entry.title);
    return title?.sub === "execute" ? [{ entry, spec: title.spec }] : [];
  });
  const occupied = workers.filter(({ entry }) => agents.some((agent) => agent.id === entry.id && agent.state !== "stopped")).length;
  let slots = run.caps.workers - occupied;
  const busy = new Set([...workers.map((worker) => worker.spec), ...relaunches.map((relaunch) => relaunch.spec)]);
  const picks = [...relaunches, ...pickRows({ ready: world.ready, states: world.states, busy, unanswered: run.unanswered, slots: Math.max(0, slots - relaunches.length), me: run.runner })];
  let launched = 0;
  for (const pick of picks) {
    if (slots <= 0) {
      report.forYou.push(`Relaunch waits for a slot: ${pick.spec} ${pick.phase}`);
      continue;
    }
    const result = await ports.launch({ subCommand: "execute", spec: pick.spec, target: pick.phase, hold: false, notes: [] });
    const last = result.text.split("\n").at(-1) ?? result.text;
    if (result.launched) {
      launched += 1;
      slots -= 1;
      report.done.push(last);
    } else report.forYou.push(`${pick.spec} ${pick.phase} not launched: ${last}`);
  }
  return launched;
}

function systemTickPorts(projectDir: string, store: RunFileStore, deps: CrewDeps): TickPorts {
  return {
    async world() {
      const own = ownSessionId(deps.env);
      const inputs = await loadBoardInputs(projectDir, { local: false, ...(own ? { ownSessionId: own } : {}) }, deps);
      if (!inputs.ok) return inputs;
      const sessions: Result<LiveSession[]> = inputs.value.sessions === "local" ? { ok: false, reason: "sessions not read" } : inputs.value.sessions;
      return { ok: true, value: { sessions, claims: inputs.value.claims, ready: buildBoard(inputs.value, deps.now()).lanes.ready, states: inputs.value.states } };
    },
    agents: () => loadAgents(deps.runner),
    closeOut: (entry, agents, claims) => closeOut(entry, { agents, claims, claudeHome: deps.claudeHome, runner: deps.runner }),
    stop(id) {
      deps.runner.run(["claude", "stop", id]);
      deps.runner.run(["claude", "rm", id]);
    },
    launch: (request) => launchCrewSession(request, store, deps, (spec, phase, options) => placeTree(projectDir, spec, phase, systemPlaceDeps(), options)),
  };
}
