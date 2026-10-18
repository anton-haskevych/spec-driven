import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { Result } from "../core/result";
import { systemRunner, type Runner } from "../core/run";
import { LAUNCH_USAGE, sessionLaunch } from "../launch/command-line";
import { launchedLine, launchInBackground } from "../launch/background";
import { freshTreeNotes, placeForLaunch, type PlaceFn } from "../launch/place-for-launch";
import type { Env } from "../core/env";
import { launchArgv, pickTerminal } from "../launch/terminal";
import { placeTree } from "../trees/place";
import { renderPlacement, systemPlaceDeps } from "./trees";

export { LAUNCH_USAGE } from "../launch/command-line";

export type { PlaceFn } from "../launch/place-for-launch";

interface LaunchRequest {
  positionals: string[];
  brief?: string;
}

// `launch execute <spec> <phase>` opens the session in the tree placement picks, and `launch babysit
// <spec> <group>` in the group's existing tree (the PR's code lives there); anything else opens here.
export async function launchCommand(projectDir: string, args: readonly string[], place?: PlaceFn, env: Env = process.env, runner: Runner = systemRunner): Promise<string> {
  const request = parseLaunchArgs(projectDir, args);
  if (!request.ok) return `launch: ${request.reason}`;
  const { positionals, brief } = request.value;
  const launch = sessionLaunch(projectDir, positionals);
  if (!launch.ok) return `launch: ${launch.reason}`;
  const [subCommand, spec, target] = positionals;
  if (!spec || target === undefined) return launchReport(projectDir, positionals, env, runner);

  const placeIt = place ?? ((name, id, options) => placeTree(projectDir, name, id, systemPlaceDeps(), options));
  const placed = await placeForLaunch({ subCommand: subCommand ?? "", spec, target }, placeIt);
  if (!placed.ok) return `launch: ${placed.reason}`;
  const placement = renderPlacement(placed);
  if (brief === undefined) return [placement, launchReport(placed.value.path, positionals, env, runner)].join("\n");
  const inTree = sessionLaunch(placed.value.path, positionals);
  if (!inTree.ok) return `launch: ${inTree.reason}`;
  return [placement, launchedLine(launchInBackground(inTree.value, brief, freshTreeNotes(placement), runner), inTree.value.title)].join("\n");
}

function parseLaunchArgs(projectDir: string, args: readonly string[]): Result<LaunchRequest> {
  let parsed;
  try {
    parsed = parseArgs({ args: [...args], options: { bg: { type: "boolean" }, brief: { type: "string" } }, allowPositionals: true, strict: true });
  } catch {
    return { ok: false, reason: `usage: ${LAUNCH_USAGE}` };
  }
  const { bg, brief } = parsed.values;
  if (!bg && brief === undefined) return { ok: true, value: { positionals: parsed.positionals } };
  if (!bg || brief === undefined) return { ok: false, reason: "--bg and --brief <file> go together" };
  if (parsed.positionals[2] === undefined) return { ok: false, reason: "--bg needs a phase or PR group" };
  const briefPath = resolve(projectDir, brief);
  if (!existsSync(briefPath)) return { ok: false, reason: `no brief file ${brief}` };
  return { ok: true, value: { positionals: parsed.positionals, brief: briefPath } };
}

export function launchReport(projectDir: string, args: readonly string[], env: Env = process.env, runner: Runner = systemRunner): string {
  const launch = sessionLaunch(projectDir, args);
  if (!launch.ok) return `launch: ${launch.reason}`;
  const runYourself = `launch: run this in a new terminal: ${launch.value.shellLine}`;

  const terminal = pickTerminal(env);
  if (!terminal) return runYourself;
  const result = runner.run(launchArgv(terminal, launch.value));
  if (result.code === 0) return `Launched: ${terminal}${tabNote(result.stdout)} — ${launch.value.title}`;
  return `${runYourself} (${terminal}: ${result.stderr.trim().split("\n")[0] ?? `exit ${result.code}`})`;
}

const LAST_SHORTCUT_TAB = 9;

function tabNote(stdout: string): string {
  const tab = stdout.trim();
  if (!/^[1-9]\d*$/.test(tab)) return "";
  return Number(tab) <= LAST_SHORTCUT_TAB ? ` tab ${tab} (⌘${tab})` : ` tab ${tab}`;
}
