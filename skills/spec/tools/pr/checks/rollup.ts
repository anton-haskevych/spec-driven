import { booleanField, isRecord, numberField, stringField, type FrontmatterData } from "../../core/frontmatter";
import { actionsJob, summarizeChecks, type CheckSummary } from "./checks";
import type { Bucket, Check } from "./types";

export type PrListState = "OPEN" | "MERGED" | "CLOSED";

export interface PrRow {
  number: number;
  branch: string;
  state: PrListState;
  draft: boolean;
  url: string;
  // The author's gh login; only the open list asks for it.
  author?: string;
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
  if (state === "CANCELLED") return "cancel";
  // QUEUED, WAITING, PENDING, EXPECTED… and any state gh adds later: unfinished, never green.
  return state === "IN_PROGRESS" ? "running" : "queued";
}

interface RollupItem {
  check: Check;
  key: string;
  startedAt: string;
}

// The newest run per workflow + check name wins, so a re-run replaces the run it repeats.
export function rollupToChecks(rollup: unknown): Check[] {
  const latest = new Map<string, RollupItem>();
  for (const item of Array.isArray(rollup) ? rollup.filter(isRecord).map(toRollupItem) : []) {
    const seen = latest.get(item.key);
    if (!seen || startOrder(item.startedAt) >= startOrder(seen.startedAt)) latest.set(item.key, item);
  }
  return [...latest.values()].map((item) => item.check);
}

// A queued re-run has no start yet (empty or 0001-01-01): it is newer than the run it repeats.
function startOrder(startedAt: string): string {
  return startedAt === "" || startedAt.startsWith("0001-") ? "9999" : startedAt;
}

function toRollupItem(record: FrontmatterData): RollupItem {
  const status = stringField(record, "status");
  const state = stringField(record, "state") ?? (status === "COMPLETED" ? stringField(record, "conclusion") : status) ?? "";
  const name = stringField(record, "name") || stringField(record, "context") || "(unnamed check)";
  const workflow = stringField(record, "workflowName") ?? "";
  const link = stringField(record, "detailsUrl") || stringField(record, "targetUrl") || "";
  const startedAt = stringField(record, "startedAt") ?? "";
  const check: Check = { name, bucket: checkBucket(state), workflow, link, ...timestamps(startedAt, stringField(record, "completedAt")), ...actionsJob(link) };
  return { check, key: `${workflow}\u0000${name}`, startedAt };
}

function timestamps(startedAt: string, completedAt: string | undefined): Pick<Check, "startedAt" | "completedAt"> {
  const real = (iso: string | undefined) => (iso && !iso.startsWith("0001-") ? iso : undefined);
  const started = real(startedAt);
  const completed = real(completedAt);
  return { ...(started ? { startedAt: started } : {}), ...(completed ? { completedAt: completed } : {}) };
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
  const author = isRecord(record.author) ? stringField(record.author, "login") : undefined;
  return { number, branch, state, draft: booleanField(record, "isDraft") ?? false, url: stringField(record, "url") ?? "", ...(author ? { author } : {}) };
}

function records(value: unknown): FrontmatterData[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
