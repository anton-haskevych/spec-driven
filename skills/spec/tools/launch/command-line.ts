import { isPrGroup } from "../claims/pr-claim";
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
  const [subCommand, specName, targetArg, ...extra] = args;
  if (!subCommand || !specName || extra.length > 0) return { ok: false, reason: `usage: ${LAUNCH_USAGE}` };
  if (!SUB_COMMANDS.has(subCommand)) return { ok: false, reason: `unknown sub-command ${subCommand} (${[...SUB_COMMANDS].join(", ")})` };
  if (!SPEC_NAME.test(specName)) return { ok: false, reason: `spec name must be kebab-case: ${specName}` };
  const target = launchTarget(subCommand, targetArg);
  if (!target.ok) return target;

  const title = launchTitle(specName, subCommand, target.value);
  const command = `claude -n ${shellQuote(title)} ${shellQuote(`${SKILL_COMMAND} ${subCommand} ${specName}${target.value ? ` ${target.value}` : ""}`)}`;
  return { ok: true, value: { title, projectDir, command, shellLine: `cd ${shellQuote(projectDir)} && ${command}` } };
}

// execute may name a phase; babysit must name a PR group; nothing else takes a third word.
function launchTarget(subCommand: string, token: string | undefined): Result<string | undefined> {
  if (subCommand === "babysit") {
    if (token === undefined) return { ok: false, reason: "babysit needs a PR group: launch babysit <spec-name> <group>" };
    return isPrGroup(token) ? { ok: true, value: token } : { ok: false, reason: `not a PR group: ${token}` };
  }
  if (token === undefined) return { ok: true, value: undefined };
  if (subCommand !== "execute") return { ok: false, reason: "a phase only goes with execute" };
  return isPhaseId(token) ? { ok: true, value: normalizePhaseHint(token) } : { ok: false, reason: `not a phase id: ${token}` };
}

export function shellQuote(text: string): string {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}
