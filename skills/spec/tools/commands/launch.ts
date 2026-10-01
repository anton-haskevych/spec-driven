import { systemRunner, type Runner } from "../core/run";
import { sessionLaunch } from "../launch/command-line";
import { launchArgv, pickTerminal, type Env } from "../launch/terminal";

export { LAUNCH_USAGE } from "../launch/command-line";

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
