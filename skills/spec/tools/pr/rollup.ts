import { booleanField, isRecord, numberField, stringField, type FrontmatterData } from "../core/frontmatter";
import { summarizeChecks, type CheckSummary } from "./checks";
import type { Bucket, Check } from "./types";

export type PrListState = "OPEN" | "MERGED" | "CLOSED";

export interface PrRow {
  number: number;
  branch: string;
  state: PrListState;
  draft: boolean;
  url: string;
  checks?: CheckSummary;
}

const PASS = new Set(["SUCCESS"]);
const SKIPPING = new Set(["SKIPPED", "NEUTRAL"]);
const FAIL = new Set(["ERROR", "FAILURE", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE"]);
const LIST_STATES: readonly PrListState[] = ["OPEN", "MERGED", "CLOSED"];

export function checkBucket(state: string): Bucket {
  if (PASS.has(state)) return "pass";
  if (SKIPPING.has(state)) return "skipping";
  if (FAIL.has(state)) return "fail";
  return state === "CANCELLED" ? "cancel" : "pending";
}

interface RollupItem {
  check: Check;
  key: string;
  startedAt: string;
}

// gh keeps the latest run per check name and workflow, so a re-run replaces the run it repeats.
export function rollupToChecks(rollup: unknown): Check[] {
  const latest = new Map<string, RollupItem>();
  for (const item of Array.isArray(rollup) ? rollup.filter(isRecord).map(toRollupItem) : []) {
    const seen = latest.get(item.key);
    if (!seen || item.startedAt > seen.startedAt) latest.set(item.key, item);
  }
  return [...latest.values()].map((item) => item.check);
}

function toRollupItem(record: FrontmatterData): RollupItem {
  const status = stringField(record, "status");
  const state = stringField(record, "state") ?? (status === "COMPLETED" ? stringField(record, "conclusion") : status) ?? "";
  const name = stringField(record, "name") || stringField(record, "context") || "(unnamed check)";
  const workflow = stringField(record, "workflowName") ?? "";
  const link = stringField(record, "detailsUrl") || stringField(record, "targetUrl") || "";
  return { check: { name, bucket: checkBucket(state), workflow, link }, key: `${workflow}\u0000${name}`, startedAt: stringField(record, "startedAt") ?? "" };
}

export function toPrRows(open: unknown, recent: unknown, externalPatterns: readonly string[]): PrRow[] {
  const rows = new Map<number, PrRow>();
  for (const record of records(open)) {
    const row = toPrRow({ ...record, state: "OPEN" });
    if (row) rows.set(row.number, { ...row, checks: summarizeChecks(rollupToChecks(record.statusCheckRollup), externalPatterns) });
  }
  for (const record of records(recent)) {
    const row = toPrRow(record);
    if (row && !rows.has(row.number)) rows.set(row.number, row);
  }
  return [...rows.values()];
}

function toPrRow(record: FrontmatterData): PrRow | undefined {
  const number = numberField(record, "number");
  const branch = stringField(record, "headRefName");
  const state = LIST_STATES.find((candidate) => candidate === stringField(record, "state"));
  if (number === undefined || !branch || !state) return undefined;
  return { number, branch, state, draft: booleanField(record, "isDraft") ?? false, url: stringField(record, "url") ?? "" };
}

function records(value: unknown): FrontmatterData[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
