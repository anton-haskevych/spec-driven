import type { Env } from "../core/env";
import type { Runner } from "../core/run";
import { FIELD_COMMAND, fieldPlan, type FieldIntent } from "../plan/ops/field";
import { readPlansAt } from "../plan/read-plans";
import { OLDER_PLUGIN } from "../record/write";
import { recordWorld, sendRecordIntent } from "../plan/record-send";
import { upgradeIfBehind } from "../plan/upgrade-send";

export interface FieldWriteDeps {
  runner: Runner;
  env: Env;
  now: () => Date;
}

export function systemFieldDeps(runner: Runner): FieldWriteDeps {
  return { runner, env: process.env, now: () => new Date() };
}

export type FieldWritten =
  | { kind: "landed"; sha: string; notes: string[] }
  | { kind: "unchanged"; notes: string[] }
  | { kind: "queued"; pending: number; notes: string[] }
  | { kind: "refused"; reason: string; notes: string[] };

// A joined spec's field is a record write; `undefined` means the spec is in files and the caller lands on main.
// A record on a newer layout may hold the field: landing it on main would hide it, so it refuses.
export async function writeJoinedField(projectDir: string, intent: FieldIntent, deps: FieldWriteDeps): Promise<FieldWritten | undefined> {
  const plans = readPlansAt(projectDir, deps.runner, deps.now());
  if (plans.record.kind === "newer") return { kind: "refused", reason: OLDER_PLUGIN, notes: [] };
  const joined = plans.joined(intent.spec);
  if (!joined) return undefined;
  const world = recordWorld(projectDir, deps);
  const notes = await upgradeIfBehind(world, projectDir, joined, deps.runner);
  const written = await sendRecordIntent(world, FIELD_COMMAND, intent, fieldPlan(intent));
  if (!written) return { kind: "refused", reason: "this repo has no origin; the board's record lives there", notes };
  switch (written.kind) {
    case "landed":
      return { kind: "landed", sha: written.tip, notes };
    case "unchanged":
      return { kind: "unchanged", notes };
    case "queued":
      return { kind: "queued", pending: written.pending, notes };
    case "refused":
    case "failed":
      return { kind: "refused", reason: written.reason, notes };
    case "invalid":
      return { kind: "refused", reason: written.problems.join("; "), notes };
    case "conflict":
      return { kind: "refused", reason: `${written.path} changed while it was written; run it again`, notes };
  }
}

// One line per outcome, after any upgrade notes: `<command>: …`.
export function fieldLine(command: string, written: FieldWritten, landed: (sha: string) => string, already: string): string {
  const last =
    written.kind === "landed"
      ? landed(written.sha.slice(0, 7))
      : written.kind === "unchanged"
        ? `${command}: ${already}`
        : written.kind === "queued"
          ? `${command}: kept on this machine (origin unreachable); ${written.pending} ${written.pending === 1 ? "change" : "changes"} not shared yet`
          : `${command}: refused, nothing written. ${written.reason}`;
  return [...written.notes, last].join("\n");
}
