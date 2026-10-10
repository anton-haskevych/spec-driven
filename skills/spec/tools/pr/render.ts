import type { Bucket } from "./checks/types";
import { externalMatcher } from "./checks/verdict";
import { checkTable } from "./check-table";
import type { PrReport } from "./report";

export const SHORT_SHA = 7;
const COUNTED: ReadonlyArray<[Bucket, string]> = [
  ["fail", "failed"],
  ["cancel", "cancelled"],
  ["running", "running"],
  ["queued", "queued"],
  ["pass", "passed"],
  ["skipping", "skipped"],
];

export function renderReport(report: PrReport, now: Date): string {
  const table = report.summary ? checkTable(report.view.checks, externalMatcher(report.externalPatterns), report, now) : [];
  return [
    header(report),
    verdictLine(report),
    ...table,
    ...(report.otherPrs.length > 0 ? [`other PRs in this spec: ${report.otherPrs.map((pr) => `#${pr}`).join(", ")}`] : []),
  ].join("\n");
}

function header({ view }: PrReport): string {
  const status = view.state === "OPEN" ? (view.isDraft ? "draft" : "ready") : view.state.toLowerCase();
  return `PR #${view.number} ${status} · mergeable ${view.mergeStateStatus} · head ${view.headRefOid.slice(0, SHORT_SHA)}`;
}

const NONE_REASON = { "no-checks": "no checks", skipped: "every check skipped" } as const;

function verdictLine({ state, summary }: PrReport): string {
  if (!summary) return `verdict: ${state}`;
  const counts = COUNTED.filter(([bucket]) => summary.counts[bucket] > 0).map(([bucket, word]) => `${summary.counts[bucket]} ${word}`);
  const reason = state === "none" && summary.verdict.kind === "none" ? [NONE_REASON[summary.verdict.reason]] : [];
  return [`verdict: ${state}`, ...reason, ...counts].join(" · ");
}
