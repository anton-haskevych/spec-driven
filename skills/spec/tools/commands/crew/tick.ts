import { parseArgs } from "node:util";
import type { ReadyRow } from "../../board/model";
import type { HeldClaim } from "../../claims/rules";
import type { Result } from "../../core/result";
import { isoTimestamp } from "../../core/schedule";
import type { SpecState } from "../../core/spec-state";
import type { CloseOut } from "../../crew/close-out";
import { claimFor, isClaimLive } from "../../crew/close-out-run";
import { runFileStore, systemCrewDeps, type CrewDeps } from "../../crew/deps";
import { overseerLine, whoseRun } from "../../crew/overseer";
import { MACHINE_WORKERS, machineFree, machineWorkers } from "../../crew/machine";
import { pickRows, workKey, type Pick } from "../../crew/pick";
import { parseRunFile, withLaunched, withLog, withOverseer, withState, type LaunchedEntry, type RunFile } from "../../crew/run-state";
import { boardScope, inScope, isRunOpen, overseenLines, scopeWorld, type CrewScope } from "../../crew/scope";
import { actionLines, afterCloseOut, finalPrMoment, nextAction } from "../../crew/tick-step";
import { parseLaunchTitle } from "../../launch/title";
import type { Task } from "../../plan/docs/phase-doc";
import type { SpecLayout } from "../../pr/groups";
import { questionLine, type QuestionRow } from "../../questions/list";
import type { Agent } from "../../sessions/agents";
import type { LiveSession } from "../../sessions/live";
import { ownSessionId } from "../../sessions/own";
import type { CrewLaunchRequest, CrewLaunchResult } from "./launch-session";
import { systemTickPorts } from "./tick-ports";

export const CREW_TICK_USAGE = "crew tick [--spec <spec>] [--no-launch]";
const NO_RUNNER = "crew tick: can't tell who runs this crew; run crew start again. Launching nothing";

export interface TickWorld {
  sessions: Result<LiveSession[]>;
  claims: readonly HeldClaim[];
  ready: readonly ReadyRow[];
  states: ReadonlyMap<string, SpecState>;
  layouts: ReadonlyMap<string, SpecLayout>;
  // A joined phase's tasks: close-out reads a lane's recorded commit from them.
  phaseTasks?: (spec: string, phase: string) => readonly Task[] | undefined;
  // Open questions of joined specs, from the record; parks of specs in files show as their phases leave ready.
  questions?: readonly QuestionRow[];
  // A spec crew's plan moved since its last tick (joined specs only).
  planChange?: string;
}

export interface TickPorts {
  world(spec?: string): Promise<Result<TickWorld>>;
  // Open spec runs: the whole-board crew leaves their specs alone.
  overseen(): Result<RunFile[]>;
  agents(): Result<Agent[]>;
  closeOut(entry: LaunchedEntry, agents: readonly Agent[], world: TickWorld): CloseOut | undefined;
  // `claude rm` keeps the transcript and the worktree: tick never removes a tree.
  stop(id: string): void;
  launch(request: CrewLaunchRequest): Promise<CrewLaunchResult>;
}

interface Report {
  done: string[];
  forYou: string[];
}

export async function crewTick(projectDir: string, args: readonly string[], deps: CrewDeps = systemCrewDeps(), overrides: Partial<TickPorts> = {}): Promise<string> {
  const flags = parseTickArgs(args);
  if (!flags) return `usage: ${CREW_TICK_USAGE}`;
  const { spec } = flags;
  const store = runFileStore(projectDir, deps.runner, spec);
  if (!store.ok) return `crew tick: ${store.reason}`;
  const ports = { ...systemTickPorts(projectDir, store.value, deps), ...overrides };
  let text = store.value.read();
  if (text === undefined) return spec ? `crew tick: no run-${spec}.md yet; run crew start --spec ${spec} first` : "crew tick: no run.md yet; run crew start first";
  const loaded = await ports.world(spec);
  if (!loaded.ok) return `crew tick: ${loaded.reason}`;
  if (!loaded.value.sessions.ok) return `crew tick: can't read sessions (${loaded.value.sessions.reason}); acting on nothing`;
  const sessions = loaded.value.sessions.value;
  const own = ownSessionId(deps.env);
  const run = parseRunFile(text);
  const verdict = whoseRun(run.overseer, sessions, own);
  if (verdict.kind === "other") return overseerLine(verdict);
  const scope = tickScope(spec, ports, loaded.value.layouts);
  if (!scope.ok) return `crew tick: ${scope.reason}`;
  const agents = ports.agents();
  if (!agents.ok) return `crew tick: ${agents.reason}`;
  const world = scopeWorld(loaded.value, scope.value.scope);

  const report: Report = { done: [...(verdict.kind === "take-over" ? [overseerLine(verdict)] : []), ...(world.planChange ? [world.planChange] : [])], forYou: overseenLines(scope.value.overseen, sessions, own) };
  if (own && run.overseer !== own) text = withOverseer(text, own);
  const passed = closeOutLaunched(run.launched, agents.value, world, ports, isoTimestamp(deps.now()), report);
  const remaining = run.launched.filter((entry) => !passed.removed.has(entry.id));
  const finished = spec !== undefined && run.launched.length === 0 && hasNoOpenPhase(world.states.get(spec));
  if (finished) report.done.push(`Finished: ${spec} has no open phase and no session out; run ended`);
  store.value.write(withLog(withLaunched(finished ? withState(text, "finished") : text, remaining), passed.logs));

  // Pausing (or a run that stood down or finished) closes sessions out but never starts new ones; neither
  // does a run that doesn't say whose it is, since every pick and launch is offered to the runner.
  const { runner } = run;
  const relaunches = passed.relaunches.filter((relaunch) => inScope(relaunch.spec, scope.value.scope));
  const held = flags.noLaunch || finished || !isRunOpen(run) ? "pausing" : runner === undefined ? "no runner" : undefined;
  if (held === "no runner") report.forYou.push(NO_RUNNER);
  if (held) report.forYou.push(...relaunches.map((relaunch) => `Relaunch held (${held}): ${relaunch.spec} ${relaunch.phase}`));
  const launched = held || runner === undefined ? 0 : await fillSlots({ remaining, agents: agents.value, machineBusy: machineWorkers(agents.value), relaunches, world, run: { ...run, runner }, ports, report });
  const questions = world.questions ?? [];
  const asked = questions.map((row) => `Question: ${questionLine(row)} · answer: question answer ${row.spec} ${row.id} "<their words>"`);
  const open = questions.length === 0 ? "" : ` · ${questions.length} ${questions.length === 1 ? "question" : "questions"} open`;
  return [...report.done, ...report.forYou, ...asked, `Tick: ${passed.removed.size} closed out · ${launched} launched · ${report.forYou.length} for you${open}`].join("\n");
}

function parseTickArgs(args: readonly string[]): { spec?: string; noLaunch: boolean } | undefined {
  try {
    const { values } = parseArgs({ args: [...args], options: { spec: { type: "string" }, "no-launch": { type: "boolean" } }, strict: true });
    return { ...(values.spec ? { spec: values.spec } : {}), noLaunch: values["no-launch"] === true };
  } catch {
    return undefined;
  }
}

// A spec crew sees its spec; the whole-board crew everything but the specs with an open run of their own.
function tickScope(spec: string | undefined, ports: TickPorts, layouts: ReadonlyMap<string, SpecLayout>): Result<{ scope: CrewScope; overseen: readonly RunFile[] }> {
  if (spec !== undefined) return { ok: true, value: { scope: { spec }, overseen: [] } };
  const overseen = ports.overseen();
  if (!overseen.ok) return overseen;
  return { ok: true, value: { scope: boardScope(overseen.value, layouts), overseen: overseen.value } };
}

function hasNoOpenPhase(state: SpecState | undefined): boolean {
  return state !== undefined && state.phases.length > 0 && state.phases.every((phase) => phase.done);
}

interface ClosedOut {
  removed: Set<string>;
  logs: string[];
  relaunches: Array<{ spec: string; phase: string }>;
}

function closeOutLaunched(launched: readonly LaunchedEntry[], agents: readonly Agent[], world: TickWorld, ports: TickPorts, at: string, report: Report): ClosedOut {
  const { claims } = world;
  const passed: ClosedOut = { removed: new Set(), logs: [], relaunches: [] };
  for (const entry of launched) {
    const title = parseLaunchTitle(entry.title);
    if (!title) continue;
    const agent = agents.find((candidate) => candidate.id === entry.id);
    const action = nextAction(title, agent, isClaimLive(claimFor(title, claims)));
    report.forYou.push(...actionLines(entry, action));
    const checked = action.kind === "close-out" ? ports.closeOut(entry, agents, world) : undefined;
    if (!checked) continue;
    const outcome = afterCloseOut(entry, title, checked, agent === undefined, at);
    const moment = finalPrMoment(title, checked, world.layouts.get(title.spec));
    if (moment) report.forYou.push(moment);
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

interface FillContext {
  remaining: readonly LaunchedEntry[];
  agents: readonly Agent[];
  // Execute workers on the whole machine, any repo: new picks stop at MACHINE_WORKERS, relaunches don't.
  machineBusy: number;
  relaunches: ReadonlyArray<{ spec: string; phase: string }>;
  world: TickWorld;
  run: RunFile & { runner: string };
  ports: TickPorts;
  report: Report;
}

async function fillSlots({ remaining, agents, machineBusy, relaunches, world, run, ports, report }: FillContext): Promise<number> {
  const workers = remaining.flatMap((entry) => {
    const title = parseLaunchTitle(entry.title);
    return title?.sub === "execute" ? [{ entry, work: { spec: title.spec, phase: title.phase ?? "" } }] : [];
  });
  const occupied = workers.filter(({ entry }) => agents.some((agent) => agent.id === entry.id && agent.state !== "stopped")).length;
  let slots = run.caps.workers - occupied;
  const out: Pick[] = workers.map(({ work }) => work);
  const busy = new Set([...out, ...relaunches].map((work) => workKey(work, world.states, world.layouts)));
  const wanted = pickRows({ ready: world.ready, states: world.states, layouts: world.layouts, busy, launched: out, unanswered: run.unanswered, slots: Math.max(0, slots - relaunches.length), me: run.runner });
  const fresh = wanted.slice(0, machineFree(machineBusy + relaunches.length));
  if (fresh.length < wanted.length) report.done.push(`Machine full: ${machineBusy} of ${MACHINE_WORKERS}`);
  const picks = [...relaunches.map((relaunch) => ({ ...relaunch, relaunch: true as const })), ...fresh];
  let launched = 0;
  let machine = machineBusy;
  for (const pick of picks) {
    if (slots <= 0) {
      report.forYou.push(`Relaunch waits for a slot: ${pick.spec} ${pick.phase}`);
      continue;
    }
    const counted = "relaunch" in pick ? { relaunch: true as const } : { machineBusy: machine };
    const result = await ports.launch({ subCommand: "execute", spec: pick.spec, target: pick.phase, hold: false, notes: [], ...counted });
    const last = result.text.split("\n").at(-1) ?? result.text;
    if (result.launched) {
      launched += 1;
      slots -= 1;
      machine += 1;
      report.done.push(last);
    } else report.forYou.push(`${pick.spec} ${pick.phase} not launched: ${last}`);
  }
  return launched;
}
