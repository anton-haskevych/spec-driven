import { isPhaseId, normalizePhaseHint, SUB_COMMANDS } from "../context/request";
import type { Result } from "../core/result";
import { launchTitle, SPEC_NAME } from "./title";

export const LAUNCH_USAGE = "launch <sub-command> <spec-name> [<phase>]";

export interface SessionLaunch {
  title: string;
  projectDir: string;
  command: string;
  shellLine: string;
}

// The plugin's qualified skill name: bare `/spec` can be shadowed by another skill of that name.
const SKILL_COMMAND = "/spec-driven:spec";

export function sessionLaunch(projectDir: string, args: readonly string[]): Result<SessionLaunch> {
  const [subCommand, specName, phaseArg, ...extra] = args;
  if (!subCommand || !specName || extra.length > 0) return { ok: false, reason: `usage: ${LAUNCH_USAGE}` };
  if (!SUB_COMMANDS.has(subCommand)) return { ok: false, reason: `unknown sub-command ${subCommand} (${[...SUB_COMMANDS].join(", ")})` };
  if (!SPEC_NAME.test(specName)) return { ok: false, reason: `spec name must be kebab-case: ${specName}` };
  if (phaseArg !== undefined && subCommand !== "execute") return { ok: false, reason: "a phase only goes with execute" };
  if (phaseArg !== undefined && !isPhaseId(phaseArg)) return { ok: false, reason: `not a phase id: ${phaseArg}` };

  const phase = phaseArg === undefined ? undefined : normalizePhaseHint(phaseArg);
  const title = launchTitle(specName, subCommand, phase);
  const command = `claude -n ${shellQuote(title)} ${shellQuote(`${SKILL_COMMAND} ${subCommand} ${specName}${phase ? ` ${phase}` : ""}`)}`;
  return { ok: true, value: { title, projectDir, command, shellLine: `cd ${shellQuote(projectDir)} && ${command}` } };
}

export function shellQuote(text: string): string {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}
