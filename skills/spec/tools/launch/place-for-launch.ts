import { prClaimId } from "../claims/pr-claim";
import type { Result } from "../core/result";
import type { Placement, PlaceOptions } from "../trees/place";

export type PlaceFn = (spec: string, phase: string, options: PlaceOptions) => Promise<Result<Placement>>;

export interface LaunchPlace {
  subCommand: string;
  spec: string;
  target: string;
  // The crew's runner: an execute launch of a spec owned by someone else is refused.
  onlyFor?: string;
}

// execute gets the tree placement picks; babysit gets the group's existing tree (the PR's code lives
// there) and never a fresh one, and is never gated: it follows a PR this crew's own worker made.
// A busy tree launches nothing.
export async function placeForLaunch({ subCommand, spec, target, onlyFor }: LaunchPlace, place: PlaceFn): Promise<Result<Placement>> {
  const placed = subCommand === "babysit" ? await place(spec, prClaimId(target), { existingOnly: true }) : await place(spec, target, onlyFor === undefined ? {} : { onlyFor });
  if (!placed.ok) return placed;
  if (placed.value.kind === "busy") return { ok: false, reason: `${placed.value.path} is busy, ${placed.value.holder}; not launched` };
  return placed;
}

// The worker's own placement sees its tree as existing, so a fresh tree's setup lines reach it only
// through the brief.
export function freshTreeNotes(renderedPlacement: string): string[] {
  return renderedPlacement.split("\n").filter((line) => line.startsWith("Setup failed:") || line.startsWith("Fresh tree:"));
}
