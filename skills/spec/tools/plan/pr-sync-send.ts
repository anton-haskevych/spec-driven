import type { Env } from "../core/env";
import type { Runner } from "../core/run";
import { writeRecord, type StoreWrite } from "../record/write";
import { validateRecordDoc } from "./kinds";
import { prSyncPlan, type PrObserved } from "./pr-sync";
import type { JoinedPlan } from "./state-source";
import { recordWorld } from "./record-send";
import { upgradeIfBehind } from "./upgrade-send";

export interface PrSyncDeps {
  runner: Runner;
  env: Env;
  now: () => Date;
}

// A direct write, never queued: a pr command has just reached GitHub, and the next pr status or board load
// repeats a sync that didn't land. The lines returned are upgrade notes and a write that didn't land.
export async function recordPr(projectDir: string, joined: JoinedPlan, seen: PrObserved, command: string, deps: PrSyncDeps): Promise<string[]> {
  const spec = joined.spec.name;
  const world = recordWorld(projectDir, deps);
  const notes = await upgradeIfBehind(world, projectDir, joined, deps.runner);
  if (!world.port) return [...notes, `${command}: PR #${seen.number} not recorded: this repo has no origin`];
  const written = await writeRecord(world.port, prSyncPlan([{ spec, seen }]), { validate: validateRecordDoc });
  const failure = failureOf(written);
  return failure ? [...notes, `${command}: PR #${seen.number} not recorded on the board: ${failure}; the next pr status records it`] : notes;
}

export function failureOf(written: StoreWrite): string | undefined {
  switch (written.kind) {
    case "landed":
    case "unchanged":
      return undefined;
    case "offline":
      return "origin unreachable";
    case "refused":
    case "failed":
      return written.reason;
    case "invalid":
      return written.problems.join("; ");
    case "conflict":
      return `${written.path} changed while it was written`;
  }
}
