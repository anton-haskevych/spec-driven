import { isoTimestamp } from "../../core/schedule";
import { validateRecordDoc } from "../../plan/kinds";
import type { PhaseDeps } from "../../plan/phase-writer";
import { readPlansAt, type PlanSource } from "../../plan/read-plans";
import { recordWorld, sendRecordIntent } from "../../plan/record-send";
import { planWrites } from "../../record/plan-writes";
import { recordViewOf } from "../../record/read";
import type { RecordView } from "../../record/view";
import { OLDER_PLUGIN, type RecordPlan } from "../../record/write";
import { CARD_COMMAND, cardIntentPlan, type CardIntent } from "../../cards/intents";
import { ownSessionId } from "../../sessions/own";
import type { Env } from "../../core/env";

export const NO_ORIGIN = "This repo has no origin; the board's record lives there.";

export const refusedLine = (action: string, reason: string) => `card ${action}: refused, nothing written. ${reason}`;

// A card edit is planned on this machine's read first, so a change that can't hold says so before
// anything is sent or queued; the send plans it again at the tip.
// `intentAt` builds the intent from that read (an edit names the version it was read at), or says why not.
export async function sendCardIntent(projectDir: string, deps: PhaseDeps, action: string, intentAt: (view: RecordView, plans: PlanSource) => CardIntent | string): Promise<string> {
  const plans = readPlansAt(projectDir, deps, deps.now());
  if (plans.record.kind === "newer") return `card ${action}: ${OLDER_PLUGIN}`;
  const view = recordViewOf(plans.record);
  if (!view) return refusedLine(action, "There is no board record here yet; card add starts one.");
  const intent = intentAt(view, plans);
  if (typeof intent === "string") return refusedLine(action, intent);
  const dry = dryRun(view, cardIntentPlan(intent));
  if (dry) return refusedLine(action, dry);
  let line: string | undefined;
  const written = await sendRecordIntent(recordWorld(projectDir, deps), CARD_COMMAND, intent, cardIntentPlan(intent, (seen) => (line = seen)));
  if (!written) return refusedLine(action, NO_ORIGIN);
  if (written.kind === "landed" || written.kind === "unchanged") return line ?? `card ${action}: done`;
  if (written.kind === "queued") return `card ${action}: kept on this machine (origin unreachable); ${written.pending} ${written.pending === 1 ? "change" : "changes"} not shared yet`;
  return refusedLine(action, writtenReason(written, action));
}

type NotWritten = { kind: "refused" | "failed"; reason: string } | { kind: "invalid"; problems: string[] } | { kind: "conflict"; path: string };

export function writtenReason(written: NotWritten, action: string): string {
  if (written.kind === "invalid") return written.problems.join("; ");
  if (written.kind === "conflict") return `${written.path} changed while it was written; run card ${action} again.`;
  return written.reason;
}

// Why the plan can't land on this view, or nothing when it can.
export function dryRun(view: RecordView, plan: RecordPlan): string | undefined {
  const planned = plan(view);
  if ("refused" in planned) return planned.refused;
  if (!("ops" in planned)) return undefined;
  const writes = planWrites(view, planned.ops, validateRecordDoc);
  if (writes.kind === "invalid") return writes.problems.join("; ");
  return writes.kind === "conflict" ? `${writes.path} changed since this machine read it; read it again` : undefined;
}

// Where a quote was heard when the caller doesn't say: this session, and now.
export function quoteDefaults(env: Env, now: Date): { ref: string; occurredAt: string } {
  const session = ownSessionId(env);
  return { ref: session ? `session ${session}` : "conversation", occurredAt: isoTimestamp(now) };
}
