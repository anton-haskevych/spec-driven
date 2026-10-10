import { alignColumns } from "../core/columns";
import type { Bucket, Check } from "./checks/types";
import { clockDuration, shortDuration, spanMs } from "./durations";
import type { MainComparison } from "./failures/main-compare";
import { TAILS_SHOWN, type FailedCheckReport } from "./report";

export const PASSED_SHOWN = 4;
export const SKIPPED_SHOWN = 3;
const LABEL_WIDTH = 8;
const DETAIL_INDENT = " ".repeat(LABEL_WIDTH + 1);
const EMPTY = "—";
const STATUS_WORD: Record<Bucket, string> = { pass: "passed", fail: "failed", queued: "queued", running: "running", skipping: "skipped", cancel: "cancelled" };

interface TableRow {
  label: string;
  cells: string[];
  details?: string[];
}

// One line per waiting, cancelled or failed check (failed with its main comparison and tail),
// then passed, skipped and external checks folded onto one line each.
export function checkTable(checks: readonly Check[], isExternal: (check: Check) => boolean, failures: readonly FailedCheckReport[], now: Date): string[] {
  const counted = checks.filter((check) => !isExternal(check));
  const inBucket = (bucket: Bucket) => counted.filter((check) => check.bucket === bucket);
  const rows: TableRow[] = [
    ...inBucket("running").map((check) => ({ label: "running", cells: [check.name, duration(check, now), runCell(check)] })),
    ...inBucket("queued").map((check) => ({ label: "queued", cells: [check.name] })),
    ...inBucket("cancel").map((check) => ({ label: "cancelled", cells: [check.name, duration(check), runCell(check)] })),
    ...(failures.length > 0 ? failures.map(failedRow) : counted.length > 0 ? [{ label: "failed", cells: [EMPTY] }] : []),
  ];
  const untailed = failures.length > TAILS_SHOWN ? [`${DETAIL_INDENT}(log tails for the first ${TAILS_SHOWN} failures only)`] : [];
  const aligned = alignColumns(rows.map((row) => row.cells));
  return [
    ...rows.flatMap((row, index) => [labelled(row.label, aligned[index] ?? ""), ...(row.details ?? []).map((line) => DETAIL_INDENT + line)]),
    ...untailed,
    ...foldedLine("passed", inBucket("pass").map((check) => withShortDuration(check)), PASSED_SHOWN),
    ...foldedLine("skipped", inBucket("skipping").map((check) => check.name), SKIPPED_SHOWN),
    ...externalLine(checks.filter(isExternal)),
  ];
}

function failedRow({ check, job, main, tail }: FailedCheckReport): TableRow {
  if (!job) return { label: "failed", cells: [check.name, duration(check), `not an Actions job: ${check.link || "no link"}`] };
  const details = tail?.ok ? tail.value : tail ? [`tail: unavailable (${tail.reason})`] : [];
  const where = `run ${job.runId} job ${job.jobId}${main ? ` · main: ${mainLine(main)}` : ""}`;
  return { label: "failed", cells: [check.name, duration(check), where], details };
}

function mainLine(main: MainComparison): string {
  if (main.kind === "unavailable") return `not checked (${main.reason})`;
  if (main.kind === "not-run") return `not run in the last ${main.runs} runs`;
  const verdict = { success: " — failure is this branch's", failure: " — main fails too" }[main.conclusion] ?? "";
  return `last ran ${main.day.slice(5)} (run ${main.runId}) → ${main.conclusion}${verdict}`;
}

function foldedLine(label: string, items: readonly string[], shown: number): string[] {
  if (items.length === 0) return [];
  const rest = items.length - shown;
  return [labelled(label, [...items.slice(0, shown), ...(rest > 0 ? [`+${rest}`] : [])].join(" · "))];
}

function externalLine(external: readonly Check[]): string[] {
  if (external.length === 0) return [];
  const open = external.filter((check) => check.bucket !== "pass");
  const passed = external.length - open.length;
  const passedPart = passed === 0 ? [] : [open.length > 0 ? `${passed} more passed` : `${passed} passed`];
  return [labelled("external", `${[...open.map((check) => `${check.name} ${STATUS_WORD[check.bucket]}`), ...passedPart].join(" · ")} (not blocking)`)];
}

function labelled(label: string, text: string): string {
  return `${label.padEnd(LABEL_WIDTH)} ${text}`.trimEnd();
}

function duration(check: Check, now?: Date): string {
  const ms = spanMs(check.startedAt, now ?? check.completedAt);
  return ms === undefined ? "" : clockDuration(ms);
}

function withShortDuration(check: Check): string {
  const ms = spanMs(check.startedAt, check.completedAt);
  return ms === undefined ? check.name : `${check.name} ${shortDuration(ms)}`;
}

function runCell(check: Check): string {
  return check.runId === undefined ? "" : `run ${check.runId}`;
}
