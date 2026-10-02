import type { Result } from "../core/result";
import { systemRunner, type Runner } from "../core/run";
import { sessionLaunch } from "../launch/command-line";
import { launchArgv, pickTerminal, type Env } from "../launch/terminal";
import { placeTree, type Placement } from "../trees/place";
import { renderPlacement, systemPlaceDeps } from "./trees";

export { LAUNCH_USAGE } from "../launch/command-line";

export type PlaceFn = (spec: string, phase: string) => Promise<Result<Placement>>;

// `launch execute <spec> <phase>` opens the session in the tree placement picks; anything else opens here.
export async function launchCommand(projectDir: string, args: readonly string[], place?: PlaceFn, env: Env = process.env, runner: Runner = systemRunner): Promise<string> {
  const launch = sessionLaunch(projectDir, args);
  if (!launch.ok) return `launch: ${launch.reason}`;
  const [, spec, phase] = args;
  if (!spec || phase === undefined) return launchReport(projectDir, args, env, runner);

  const placeIt = place ?? ((name, id) => placeTree(projectDir, name, id, systemPlaceDeps()));
  const placed = await placeIt(spec, phase);
  if (!placed.ok) return `launch: ${placed.reason}`;
  if (placed.value.kind === "busy") return `launch: ${placed.value.path} is busy, ${placed.value.holder}; not launched`;
  return [renderPlacement(placed), launchReport(placed.value.path, args, env, runner)].join("\n");
}

export function launchReport(projectDir: string, args: readonly string[], env: Env = process.env, runner: Runner = systemRunner): string {
  const launch = sessionLaunch(projectDir, args);
  if (!launch.ok) return `launch: ${launch.reason}`;
  const runYourself = `launch: run this in a new terminal: ${launch.value.shellLine}`;

  const terminal = pickTerminal(env);
  if (!terminal) return runYourself;
  const result = runner.run(launchArgv(terminal, launch.value));
  if (result.code === 0) return `Launched: ${terminal} — ${launch.value.title}`;
  return `${runYourself} (${terminal}: ${result.stderr.trim().split("\n")[0] ?? `exit ${result.code}`})`;
}
