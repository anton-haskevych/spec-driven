import { SUB_COMMANDS } from "../context/request";
import type { Result } from "../core/result";

export const LAUNCH_USAGE = "launch <sub-command> <spec-name>";

export interface SessionLaunch {
  title: string;
  projectDir: string;
  command: string;
  shellLine: string;
}

const SPEC_NAME = /^[a-z0-9][a-z0-9-]*$/;
// The plugin's qualified skill name: bare `/spec` can be shadowed by another skill of that name.
const SKILL_COMMAND = "/spec-driven:spec";

export function sessionLaunch(projectDir: string, args: readonly string[]): Result<SessionLaunch> {
  const [subCommand, specName] = args;
  if (!subCommand || !specName) return { ok: false, reason: `usage: ${LAUNCH_USAGE}` };
  if (!SUB_COMMANDS.has(subCommand)) return { ok: false, reason: `unknown sub-command ${subCommand} (${[...SUB_COMMANDS].join(", ")})` };
  if (!SPEC_NAME.test(specName)) return { ok: false, reason: `spec name must be kebab-case: ${specName}` };

  const title = `${specName} ${subCommand}`;
  const command = `claude -n ${shellQuote(title)} ${shellQuote(`${SKILL_COMMAND} ${subCommand} ${specName}`)}`;
  return { ok: true, value: { title, projectDir, command, shellLine: `cd ${shellQuote(projectDir)} && ${command}` } };
}

export function shellQuote(text: string): string {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}
