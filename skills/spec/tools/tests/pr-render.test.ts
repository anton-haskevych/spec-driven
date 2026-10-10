import { describe, expect, test } from "bun:test";
import { summarizeChecks } from "../pr/checks/checks";
import type { Check } from "../pr/checks/types";
import { renderReport } from "../pr/render";
import type { PrReport } from "../pr/report";
import { check, prView } from "./pr-factories";

const NOW = new Date("2026-10-10T21:16:00Z");
const at = (minute: number, second = 0) => `2026-10-10T21:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}Z`;
const job = (runId: number, jobId: number) => ({ runId, jobId, link: `https://github.com/acme/app/actions/runs/${runId}/job/${jobId}` });
const passed = (name: string, minutes: number) => check({ name, bucket: "pass", startedAt: at(0), completedAt: at(minutes) });
const skipped = (name: string) => check({ name, bucket: "skipping" });

function report(checks: Check[], overrides: Partial<PrReport> = {}): PrReport {
  const summary = summarizeChecks(checks, ["Vercel*"]);
  return { view: prView({ number: 921, headRefOid: "1a2b3c4d5e6f", checks }), state: summary.verdict.kind, summary, externalPatterns: ["Vercel*"], failures: [], otherPrs: [], ...overrides };
}

describe("renderReport", () => {
  test("waiting: running with elapsed, queued, an empty failed row, folded passed and skipped, external apart", () => {
    const checks = [
      check({ name: "E2E Tests", bucket: "running", startedAt: at(8, 48), ...job(3788, 1) }),
      check({ name: "Backend Tests", bucket: "running", startedAt: at(10, 20), ...job(3787, 2) }),
      check({ name: "Stripe Sandbox Tests", bucket: "queued" }),
      passed("Frontend Lint", 2), passed("Frontend Tests (1/2)", 6), passed("Frontend Tests (2/2)", 6), passed("Monorepo Production Build", 4), passed("Ops Tests", 1), passed("Hooks Tests", 1),
      skipped("Infra Build & Test"), skipped("DB Schema & Tests"), skipped("Ops Lint"), skipped("Video Tests"),
      check({ name: "Vercel – crm-dance-landing", bucket: "queued", workflow: "" }),
      check({ name: "Vercel – allstars-academy", workflow: "" }),
    ];
    expect(renderReport(report(checks), NOW)).toBe(
      [
        "PR #921 ready · mergeable CLEAN · head 1a2b3c4",
        "verdict: waiting · 2 running · 1 queued · 6 passed · 4 skipped",
        "running  E2E Tests             7m12s  run 3788",
        "running  Backend Tests         5m40s  run 3787",
        "queued   Stripe Sandbox Tests",
        "failed   —",
        "passed   Frontend Lint 2m · Frontend Tests (1/2) 6m · Frontend Tests (2/2) 6m · Monorepo Production Build 4m · +2",
        "skipped  Infra Build & Test · DB Schema & Tests · Ops Lint · +1",
        "external Vercel – crm-dance-landing queued · 1 more passed (not blocking)",
      ].join("\n"),
    );
  });

  test("red: the failed row carries run, job, main and the tail beneath it", () => {
    const e2e = check({ name: "E2E Tests", bucket: "fail", startedAt: at(0), completedAt: at(9, 3), ...job(3788, 9921) });
    const failure = {
      check: e2e,
      job: { runId: 3788, jobId: 9921 },
      main: { kind: "ran" as const, runId: 3700, day: "2026-10-09", conclusion: "success" },
      tail: { ok: true as const, value: ["##[error] card-reader.spec.ts:41 Timeout 30000ms exceeded"] },
    };
    const text = renderReport(report([e2e, passed("Lint", 2)], { failures: [failure] }), NOW).split("\n");
    expect(text.slice(1)).toEqual([
      "verdict: red · 1 failed · 1 passed",
      "failed   E2E Tests  9m03s  run 3788 job 9921 · main: last ran 10-09 (run 3700) → success — failure is this branch's",
      "         ##[error] card-reader.spec.ts:41 Timeout 30000ms exceeded",
      "passed   Lint 2m",
    ]);
  });

  test("failures that aren't Actions jobs, unavailable tails, cancelled checks and other PRs", () => {
    const results = check({ name: "Results", bucket: "fail", link: "https://github.com/acme/app/runs/5" });
    const smoke = check({ name: "Smoke", bucket: "fail", ...job(1, 4) });
    const lost = check({ name: "Deploy", bucket: "cancel", ...job(1, 5) });
    const text = renderReport(
      report([results, smoke, lost], {
        failures: [
          { check: results, job: undefined },
          { check: smoke, job: { runId: 1, jobId: 4 }, main: { kind: "not-run", runs: 15 }, tail: { ok: false, reason: "gh call budget (30) spent" } },
        ],
        otherPrs: [779, 801],
      }),
      NOW,
    );
    expect(text).toContain("cancelled Deploy");
    expect(text).toContain("not an Actions job: https://github.com/acme/app/runs/5");
    expect(text).toContain("run 1 job 4 · main: not run in the last 15 runs");
    expect(text).toContain("         tail: unavailable (gh call budget (30) spent)");
    expect(text.split("\n").at(-1)).toBe("other PRs in this spec: #779, #801");
  });

  test("a merged PR has a verdict line and no table", () => {
    const merged = renderReport({ ...report([]), view: prView({ number: 871, state: "MERGED", headRefOid: "084ec54f1be9" }), state: "merged", summary: undefined }, NOW);
    expect(merged.split("\n")).toEqual(["PR #871 merged · mergeable CLEAN · head 084ec54", "verdict: merged"]);
  });

  test("every external check passed reads as a count", () => {
    const text = renderReport(report([passed("Lint", 1), check({ name: "Vercel – a", workflow: "" })]), NOW);
    expect(text.split("\n").at(-1)).toBe("external 1 passed (not blocking)");
  });
});

describe("renderReport: none and many failures", () => {
  test("none says why, and an empty PR has no table", () => {
    expect(renderReport(report([]), NOW).split("\n").slice(1)).toEqual(["verdict: none · no checks"]);
    expect(renderReport(report([skipped("E2E")]), NOW).split("\n").slice(1, 2)).toEqual(["verdict: none · every check skipped · 1 skipped"]);
  });

  test("past the tailed failures, one note instead of a line per failure", () => {
    const failing = Array.from({ length: 5 }, (_, index) => check({ name: `Job ${index}`, bucket: "fail", ...job(1, index) }));
    const failures = failing.map((one, index) => ({ check: one, job: { runId: 1, jobId: index }, ...(index < 3 ? { tail: { ok: true as const, value: ["boom"] } } : {}) }));
    const lines = renderReport(report(failing, { failures }), NOW).split("\n");
    expect(lines.filter((line) => line.trim() === "boom")).toHaveLength(3);
    expect(lines.at(-1)).toBe("         (log tails for the first 3 failures only)");
  });
});
