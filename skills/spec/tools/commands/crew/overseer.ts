import { parseArgs } from "node:util";
import { setFrontmatterLine } from "../../core/frontmatter-patch";
import { gitAt, runnerName } from "../../core/git";
import type { Result } from "../../core/result";
import { isoTimestamp } from "../../core/schedule";
import { runFileStore, systemCrewDeps, type CrewDeps } from "../../crew/deps";
import { overseerLine, whoseRun, type OverseerVerdict } from "../../crew/overseer";
import { newRunFile, parseRunFile, withOverseer, withRunner, type Caps } from "../../crew/run-state";
import { loadSettings } from "../../playbook/settings";
import { ownSessionId } from "../../sessions/own";

export const CREW_OVERSEER_USAGE = "crew overseer";
export const CREW_START_USAGE = "crew start [--workers <n>] [--babysitters <n>]";

export function crewOverseer(projectDir: string, _args: readonly string[], deps: CrewDeps = systemCrewDeps()): string {
  const verdict = runVerdict(projectDir, deps);
  return verdict.ok ? overseerLine(verdict.value) : `crew overseer: ${verdict.reason}`;
}

export function crewStart(projectDir: string, args: readonly string[], deps: CrewDeps = systemCrewDeps()): string {
  const caps = parseCaps(args);
  if (!caps.ok) return caps.reason;
  const store = runFileStore(projectDir, deps.runner);
  if (!store.ok) return `crew start: ${store.reason}`;
  const verdict = runVerdict(projectDir, deps);
  if (!verdict.ok) return `crew start: ${verdict.reason}`;
  if (verdict.value.kind === "other") return `crew start: ${overseerLine(verdict.value).replace("Overseer: ", "")}`;
  const own = ownSessionId(deps.env);
  if (!own) return "crew start: CLAUDE_CODE_SESSION_ID is unset; run it from the overseer session";
  // The crew's one "me" for the whole run: the tick and every launch read it back from run.md.
  const runner = runnerName(gitAt(projectDir, deps.runner));
  if (!runner.ok) return `crew start: ${runner.reason}, then start again`;

  const existing = store.value.read();
  const previous = existing === undefined ? undefined : parseRunFile(existing).runner;
  const text =
    existing === undefined
      ? newRunFile({ overseer: own, runner: runner.value, started: isoTimestamp(deps.now()), caps: { ...settingsCaps(projectDir), ...caps.value }, ...cliVersion(deps) })
      : merged(withRunner(existing, runner.value), own, caps.value);
  store.value.write(text);
  const run = parseRunFile(text);
  const was = previous !== undefined && previous !== runner.value ? ` (was ${previous})` : "";
  return `Crew: ${startedHow(verdict.value)} for ${runner.value}${was} · overseer ${own} · ${run.caps.workers} workers, ${run.caps.babysitters} babysitters`;
}

// A new run starts from settings crew:; a run being taken over keeps the caps it has.
function settingsCaps(projectDir: string): Caps {
  const { workers, babysitters } = loadSettings(projectDir).crew;
  return { workers, babysitters };
}

function runVerdict(projectDir: string, deps: CrewDeps): Result<OverseerVerdict> {
  const store = runFileStore(projectDir, deps.runner);
  if (!store.ok) return store;
  const text = store.value.read();
  const recorded = text === undefined ? undefined : parseRunFile(text).overseer;
  if (recorded === undefined) return { ok: true, value: { kind: "own" } };
  const sessions = deps.liveSessions();
  if (!sessions.ok) return { ok: false, reason: `can't read sessions (${sessions.reason}); not taking over` };
  return { ok: true, value: whoseRun(recorded, sessions.value, ownSessionId(deps.env)) };
}

function merged(text: string, overseer: string, caps: Partial<Caps>): string {
  const lines: Array<[string, string]> = [["state", "running"], ...Object.entries(caps).map(([key, value]): [string, string] => [key, String(value)])];
  return lines.reduce((current, [key, value]) => {
    const patched = setFrontmatterLine(current, key, value);
    return patched.kind === "ok" ? patched.text : current;
  }, withOverseer(text, overseer));
}

function startedHow(verdict: OverseerVerdict): string {
  return verdict.kind === "take-over" ? `taken over from ${verdict.from}` : "started";
}

function cliVersion(deps: CrewDeps): { cli?: string } {
  const result = deps.runner.run(["claude", "--version"]);
  const version = result.code === 0 ? result.stdout.trim().split(/\s+/)[0] : undefined;
  return version ? { cli: version } : {};
}

function parseCaps(args: readonly string[]): Result<Partial<Caps>> {
  const usage = { ok: false as const, reason: `usage: ${CREW_START_USAGE}` };
  let values;
  try {
    values = parseArgs({ args: [...args], options: { workers: { type: "string" }, babysitters: { type: "string" } }, strict: true }).values;
  } catch {
    return usage;
  }
  const caps: Partial<Caps> = {};
  for (const key of ["workers", "babysitters"] as const) {
    const raw = values[key];
    if (raw === undefined) continue;
    if (!/^\d+$/.test(raw)) return usage;
    caps[key] = Number(raw);
  }
  return { ok: true, value: caps };
}
