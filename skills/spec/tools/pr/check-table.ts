import { alignColumns } from "../core/columns";
import type { Bucket, Check } from "./checks/types";
import { clockDuration, shortDuration, spanMs } from "./durations";
import type { MainComparison } from "./failures/main-compare";
import type { InfraFact } from "./failures/triage";
import type { Result } from "../core/result";
import type { FailedCheckReport, PrReport } from "./report";

export const TAILS_SHOWN = 3;
export const PASSED_SHOWN = 4;
export const SKIPPED_SHOWN = 3;
const LABEL_WIDTH = 8;
const DETAIL_INDENT = " ".repeat(LABEL_WIDTH + 1);
const EMPTY = "—";
const MAIN_FAILED = new Set(["failure", "timed_out"]);
const STATUS_WORD: Record<Bucket, string> = { pass: "passed", fail: "failed", queued: "queued", running: "running", skipping: "skipped", cancel: "cancelled" };

interface TableRow {
  label: string;
  cells: string[];
  details?: string[];
}

// One line per waiting, failed or cancelled check (the last two with their failure facts, saved log and
// tail), the triage gate, then passed, skipped and external checks folded onto one line each.
export function checkTable(checks: readonly Check[], isExternal: (check: Check) => boolean, report: Pick<PrReport, "failures" | "triageGate">, now: Date): string[] {
  const { failures } = report;
  const counted = checks.filter((check) => !isExternal(check));
  const inBucket = (bucket: Bucket) => counted.filter((check) => check.bucket === bucket);
  const rows: TableRow[] = [
    ...inBucket("running").map((check) => ({ label: "running", cells: [check.name, duration(check, now), runCell(check)] })),
    ...inBucket("queued").map((check) => ({ label: "queued", cells: [check.name] })),
    ...(failures.some((failure) => failure.check.bucket === "fail") || counted.length === 0 ? [] : [{ label: "failed", cells: [EMPTY] }]),
    ...failures.map((failure, index) => failedRow(failure, index < TAILS_SHOWN)),
  ];
  const untailed = failures.length > TAILS_SHOWN ? [`${DETAIL_INDENT}(log tails for the first ${TAILS_SHOWN} failures only; every log is saved)`] : [];
  const aligned = alignColumns(rows.map((row) => row.cells));
  return [
    ...rows.flatMap((row, index) => [labelled(row.label, aligned[index] ?? ""), ...(row.details ?? []).map((line) => DETAIL_INDENT + line)]),
    ...untailed,
    ...(failures.length > 0 ? [labelled("triage", triageLine(report.triageGate))] : []),
    ...foldedLine("passed", inBucket("pass").map((check) => withShortDuration(check)), PASSED_SHOWN),
    ...foldedLine("skipped", inBucket("skipping").map((check) => check.name), SKIPPED_SHOWN),
    ...externalLine(checks.filter(isExternal)),
  ];
}

function failedRow({ check, job, main, infra, tail, logPath }: FailedCheckReport, withTail: boolean): TableRow {
  const label = STATUS_WORD[check.bucket];
  if (!job) return { label, cells: [check.name, duration(check), `not an Actions job: ${check.link || "no link"}`] };
  const facts = [`run ${job.runId} job ${job.jobId}`, ...(main ? [`fails on main too: ${mainFact(main)}`] : []), ...(infra ? [`infra: ${infraLine(infra)}`] : [])];
  const tailLines = !withTail || !tail ? [] : tail.ok ? tail.value : [`tail: unavailable (${tail.reason})`];
  return { label, cells: [check.name, duration(check), facts.join(" · ")], details: [...(logPath ? [`log ${logPath}`] : []), ...tailLines] };
}

function mainFact(main: MainComparison): string {
  if (main.kind === "unavailable") return `unknown (${main.reason})`;
  if (main.kind === "not-run") return `unknown (not run in the last ${main.runs} runs)`;
  const where = `run ${main.runId}, ${main.day.slice(5)}`;
  if (MAIN_FAILED.has(main.conclusion)) return `yes (${where})`;
  return main.conclusion === "success" ? `no (${where})` : `unknown (${main.conclusion} on main, ${where})`;
}

function infraLine(infra: Result<InfraFact>): string {
  if (!infra.ok) return `unknown (${infra.reason})`;
  const answer = infra.value.infra ? "yes" : "no";
  return infra.value.reason ? `${answer} (${infra.value.reason})` : answer;
}

function triageLine(gate: string | undefined): string {
  return gate ? `gate ${gate} (gates.ci-triage)` : "none — name a gates.md section in gates.ci-triage (docs/specs/_playbook/settings.md)";
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
