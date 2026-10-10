import { clockDuration, shortDuration, spanMs } from "../durations";
import type { Bucket, Check, PrView } from "../checks/types";
import { checksVerdict } from "../checks/verdict";
import type { EventKind } from "./log";

export interface WaitContext {
  sha?: string;
  // A failure that completed before this ISO time is from before the last push or re-run.
  since?: string;
  isExternal: (check: Check) => boolean;
  startedMs: number;
}

export interface Settle {
  event: EventKind;
  detail?: string;
}

export type WaitStep = { settle: Settle } | { waiting: string };

// Right after a push GitHub may list no checks for a while; a skip-only start may still grow real runs.
export const NO_CHECKS_GRACE_MS = 180_000;
const SHORT_SHA = 7;
const LISTED_MAX = 3;
const STALE_NOTE = " (re-run not started)";

export function settleLine(pr: number, settle: Settle): string {
  return `PR #${pr}: ${[settle.event, settle.detail].filter(Boolean).join(" · ")}`;
}

export function waitStep(view: PrView, context: WaitContext, nowMs: number): WaitStep {
  if (view.state === "MERGED") return { settle: { event: "merged", ...(view.mergeCommit ? { detail: short(view.mergeCommit) } : {}) } };
  if (view.state === "CLOSED") return { settle: { event: "closed" } };
  if (context.sha && !view.headRefOid.startsWith(context.sha)) return { waiting: `head ${short(view.headRefOid)}, waiting for ${short(context.sha)}` };
  if (view.mergeable === "CONFLICTING") return { settle: { event: "conflicting" } };

  const checks = withoutStaleFailures(view.checks, context.since);
  const verdict = checksVerdict(checks, context.isExternal);
  const inGrace = nowMs - context.startedMs < NO_CHECKS_GRACE_MS;
  const head = short(view.headRefOid);
  switch (verdict.kind) {
    case "waiting":
      return { waiting: pendingSummary(verdict.running, verdict.queued, nowMs) };
    case "green":
      return { settle: { event: "green", detail: greenDetail(verdict.passed, verdict.skipped, checks.filter(context.isExternal)) } };
    case "red":
      return { settle: { event: "red", detail: listed(verdict.failed.map(failedText)) } };
    case "cancelled":
      return { settle: { event: "cancelled", detail: `${names(verdict.cancelled)} cancelled, no newer run` } };
    case "none":
      if (verdict.reason === "no-checks") {
        return inGrace ? { waiting: `no checks yet on ${head}` } : { settle: { event: "none", detail: `no checks on ${head} after ${shortDuration(nowMs - context.startedMs)}` } };
      }
      return inGrace ? { waiting: `CI skipped itself so far on ${head}` } : { settle: { event: "none", detail: `CI skipped itself on ${head} — push a new commit` } };
  }
}

// The re-run's row may not be in the rollup yet; until it is, the old failure is not an answer.
function withoutStaleFailures(checks: readonly Check[], since: string | undefined): Check[] {
  const sinceMs = since ? Date.parse(since) : Number.NaN;
  if (Number.isNaN(sinceMs)) return [...checks];
  const isStale = (check: Check) => (check.bucket === "fail" || check.bucket === "cancel") && check.completedAt !== undefined && Date.parse(check.completedAt) < sinceMs;
  return checks.map((check) => (isStale(check) ? { ...check, bucket: "queued", name: `${check.name}${STALE_NOTE}` } : check));
}

function pendingSummary(running: readonly Check[], queued: readonly Check[], nowMs: number): string {
  const ranFor = (check: Check) => {
    const ms = spanMs(check.startedAt, new Date(nowMs));
    return ms === undefined ? check.name : `${check.name} ${shortDuration(ms)}`;
  };
  const parts = [running.length > 0 ? `running: ${listed(running.map(ranFor))}` : "", queued.length > 0 ? `queued: ${names(queued)}` : ""];
  return parts.filter(Boolean).join(" · ");
}

const EXTERNAL_STATES: ReadonlyArray<[label: string, buckets: readonly Bucket[]]> = [
  ["pending", ["queued", "running"]],
  ["failed", ["fail", "cancel"]],
];

function greenDetail(passed: number, skipped: number, external: readonly Check[]): string {
  const unsettled = EXTERNAL_STATES.flatMap(([label, buckets]) => {
    const count = external.filter((check) => buckets.includes(check.bucket)).length;
    return count > 0 ? [`${count} ${label}`] : [];
  });
  const externalNote = unsettled.length > 0 ? `external ${unsettled.join(", ")} (not blocking)` : "";
  return [`${passed} passed`, skipped > 0 ? `${skipped} skipped` : "", externalNote].filter(Boolean).join(" · ");
}

function failedText(check: Check): string {
  const ms = spanMs(check.startedAt, check.completedAt);
  return ms === undefined ? `${check.name} failed` : `${check.name} failed (${clockDuration(ms)})`;
}

function names(checks: readonly Check[]): string {
  return listed(checks.map((check) => check.name));
}

// The settle line is one line an agent reads; pr status has the full table.
function listed(items: readonly string[]): string {
  const shown = items.slice(0, LISTED_MAX).join(", ");
  return items.length > LISTED_MAX ? `${shown} +${items.length - LISTED_MAX} more` : shown;
}

function short(sha: string): string {
  return sha.slice(0, SHORT_SHA);
}
