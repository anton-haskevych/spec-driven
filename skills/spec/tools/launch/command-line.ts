import { isPrGroup } from "../claims/pr-claim";
import { isPhaseId, normalizePhaseHint, SUB_COMMANDS } from "../context/request";
import type { Env } from "../core/env";
import type { Result } from "../core/result";
import { launchTitle, SPEC_NAME } from "./title";

export const LAUNCH_USAGE = "launch <sub-command> <spec-name> [<phase> | <group> [hold]] [--bg --brief <file>]";

export interface SessionLaunch {
  title: string;
  projectDir: string;
  prompt: string;
  command: string;
  shellLine: string;
  model?: string;
  effort?: string;
}

// The plugin's qualified skill name: bare `/spec` can be shadowed by another skill of that name.
const SKILL_COMMAND = "/spec-driven:spec";

const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

export function sessionLaunch(projectDir: string, args: readonly string[], env: Env = {}): Result<SessionLaunch> {
  const [subCommand, specName, targetArg, ...extra] = args;
  const hold = subCommand === "babysit" && extra.length === 1 && extra[0] === "hold";
  if (!subCommand || !specName || (extra.length > 0 && !hold)) return { ok: false, reason: `usage: ${LAUNCH_USAGE}` };
  if (!SUB_COMMANDS.has(subCommand)) return { ok: false, reason: `unknown sub-command ${subCommand} (${[...SUB_COMMANDS].join(", ")})` };
  if (!SPEC_NAME.test(specName)) return { ok: false, reason: `spec name must be kebab-case: ${specName}` };
  const target = launchTarget(subCommand, targetArg);
  if (!target.ok) return target;
  const settings = launchSettings(env);
  if (!settings.ok) return settings;

  const title = launchTitle(specName, subCommand, target.value);
  const prompt = [SKILL_COMMAND, subCommand, specName, target.value, hold ? "hold" : undefined].filter(Boolean).join(" ");
  const flags = claudeFlags(settings.value).map((word) => (word.startsWith("--") ? word : shellQuote(word)));
  const command = ["claude", "-n", shellQuote(title), ...flags, shellQuote(prompt)].join(" ");
  return { ok: true, value: { title, projectDir, prompt, command, shellLine: `cd ${shellQuote(projectDir)} && ${command}`, ...settings.value } };
}

// Whoever wants every launched session on one model or effort sets SPEC_LAUNCH_MODEL / SPEC_LAUNCH_EFFORT
// (Claude Code's `env` setting will do); unset, the new session starts on the user's own defaults.
function launchSettings(env: Env): Result<Pick<SessionLaunch, "model" | "effort">> {
  const model = env.SPEC_LAUNCH_MODEL?.trim();
  const effort = env.SPEC_LAUNCH_EFFORT?.trim().toLowerCase();
  if (effort && !EFFORTS.includes(effort)) return { ok: false, reason: `SPEC_LAUNCH_EFFORT must be one of ${EFFORTS.join(", ")}, not ${effort}` };
  return { ok: true, value: { ...(model ? { model } : {}), ...(effort ? { effort } : {}) } };
}

// `claude` and `orca agent launch` take these flags by the same names.
export function claudeFlags(launch: Pick<SessionLaunch, "model" | "effort">): string[] {
  return [...(launch.model ? ["--model", launch.model] : []), ...(launch.effort ? ["--effort", launch.effort] : [])];
}

// execute may name a phase; babysit must name a PR group; nothing else takes a third word.
// oversee-crew runs in the session Anton types it in, so it is never launched.
function launchTarget(subCommand: string, token: string | undefined): Result<string | undefined> {
  if (subCommand === "oversee-crew") return { ok: false, reason: "oversee-crew isn't launched: type /spec oversee-crew [<spec>] in the project's main checkout" };
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
