import type { MainComparison } from "./failures/main-compare";
import type { FailedCheckReport, PrReport } from "./report";

const HEAD_LENGTH = 8;

export function renderReport(report: PrReport): string {
  return [
    header(report),
    `state: ${report.state}`,
    ...checksLine(report),
    ...report.failures.flatMap(failureLines),
    ...(report.otherPrs.length > 0 ? [`other PRs in this spec: ${report.otherPrs.map((pr) => `#${pr}`).join(", ")}`] : []),
  ].join("\n");
}

function header({ view }: PrReport): string {
  const status = view.state === "OPEN" ? (view.isDraft ? "draft" : "ready") : view.state.toLowerCase();
  return `PR #${view.number} ${status} · mergeable ${view.mergeStateStatus} · head ${view.headRefOid.slice(0, HEAD_LENGTH)}`;
}

function checksLine({ summary, externalPatterns }: PrReport): string[] {
  if (!summary) return [];
  const { pass, fail, skipping, queued, running, cancel } = summary.counts;
  const parts = [`${pass} pass`, `${fail} fail`, `${skipping} skipped`, `${queued + running} pending`];
  if (cancel > 0) parts.push(`${cancel} cancelled`);
  if (externalPatterns.length > 0) parts.push(`${summary.external} external (${externalPatterns.join(", ")})`);
  return [`checks: ${parts.join(" · ")}`];
}

function failureLines({ check, job, main, tail }: FailedCheckReport): string[] {
  const title = `FAIL ${check.workflow ? `${check.workflow} › ` : ""}${check.name}`;
  if (!job) return [`${title} (not an Actions job: ${check.link || "no link"})`];
  const lines = [`${title} (run ${job.runId}, job ${job.jobId})`];
  if (main) lines.push(`  main: ${mainLine(main)}`);
  if (tail && !tail.ok) lines.push(`  tail: unavailable (${tail.reason})`);
  if (tail?.ok) lines.push("  tail:", ...tail.value.map((line) => `    ${line}`));
  return lines;
}

function mainLine(main: MainComparison): string {
  if (main.kind === "unavailable") return `not checked (${main.reason})`;
  if (main.kind === "not-run") return `not run in the last ${main.runs} runs`;
  const verdict = { success: " — failure is this branch's", failure: " — main fails too" }[main.conclusion] ?? "";
  return `last ran ${main.day.slice(5)} (run ${main.runId}) → ${main.conclusion}${verdict}`;
}
