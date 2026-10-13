import { parseArgs } from "node:util";
import type { Result } from "../../core/result";
import { runFileStore, systemCrewDeps, type CrewDeps } from "../../crew/deps";
import { launchCrewSession, type CrewLaunchRequest } from "./launch-session";
import type { PlaceFn } from "../../launch/place-for-launch";
import { placeTree } from "../../trees/place";
import { systemPlaceDeps } from "../trees";

export const CREW_LAUNCH_USAGE = "crew launch execute <spec> <phase> | crew launch babysit <spec> <group> [hold] [--note <text>]…";

export async function crewLaunch(projectDir: string, args: readonly string[], deps: CrewDeps = systemCrewDeps(), place?: PlaceFn): Promise<string> {
  const request = parseLaunch(args);
  if (!request.ok) return request.reason;
  const store = runFileStore(projectDir, deps.runner);
  if (!store.ok) return `crew launch: ${store.reason}`;
  const placeIt = place ?? ((spec, phase, options) => placeTree(projectDir, spec, phase, systemPlaceDeps(), options));
  return (await launchCrewSession(request.value, store.value, deps, placeIt)).text;
}

function parseLaunch(args: readonly string[]): Result<CrewLaunchRequest> {
  const usage = { ok: false as const, reason: `usage: ${CREW_LAUNCH_USAGE}` };
  let parsed;
  try {
    parsed = parseArgs({ args: [...args], options: { note: { type: "string", multiple: true } }, allowPositionals: true, strict: true });
  } catch {
    return usage;
  }
  const [subCommand, spec, target, ...extra] = parsed.positionals;
  if ((subCommand !== "execute" && subCommand !== "babysit") || !spec || !target) return usage;
  const hold = subCommand === "babysit" && extra.length === 1 && extra[0] === "hold";
  if (extra.length > 0 && !hold) return usage;
  return { ok: true, value: { subCommand, spec, target, hold, notes: parsed.values.note ?? [] } };
}
