import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ghClient } from "../pr/gh";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { jobLogFile, savedJobLogs } from "../pr/failures/job-logs";
import { buildReport } from "../pr/report";
import { check, prView } from "./pr-factories";
import { sequencedRunner } from "./stub-runner";

const fixture = (name: string) => Bun.file(join(import.meta.dir, "fixtures", name)).text();
const VIEW = await fixture("gh-pr-view-rollup-states.json");
const RUN_JOBS = await fixture("gh-run-jobs.json");
const RUN_LIST = await fixture("gh-run-list.json");
const LOG = await fixture("gh-job-log.txt");
const RUN_VIEW = await fixture("gh-run-view.json");
const TIMEOUT_LOG = await fixture("gh-job-log-timeout.txt");
const RUN_DETAIL: readonly string[] = ["gh", "run", "view", "36796809320", "--json", "status,conclusion,attempt,jobs"];
const UNKNOWN = prView({ mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN", headRefOid: "08bb7dbd" });

describe("buildReport", () => {
  test("re-polls mergeability once, then reports failing jobs with tail and main comparison", () => {
    const runner = sequencedRunner([
      [["gh", "pr", "view"], [{ stdout: VIEW }]],
      [["gh", "api"], [{ stdout: LOG }]],
      [RUN_DETAIL, [{ stdout: RUN_VIEW }]],
      [["gh", "run", "view"], [{ stdout: RUN_JOBS }]],
      [["gh", "run", "list"], [{ stdout: RUN_LIST }]],
    ]);
    const report = buildReport(ghClient("/repo", runner), UNKNOWN, { externalPatterns: ["Vercel*"], defaultBranch: "main" });

    expect(report.view.mergeStateStatus).toBe("UNSTABLE");
    expect(report.state).toBe("red");
    expect(report.failures.map((failure) => failure.check.name)).toEqual(["Backend Tests", "Backend Test Results", "Infra Build"]);
    const [backend, results] = report.failures;
    expect(backend?.tail?.ok && backend.tail.value.at(-1)).toBe("##[error]Process completed with exit code 1.");
    expect(backend?.main).toMatchObject({ kind: "ran", conclusion: "failure" });
    expect(backend?.infra).toEqual({ ok: true, value: { infra: false } });
    expect(backend?.logPath).toBeUndefined();
    expect(results?.job).toBeUndefined();
    expect(runner.calls.length).toBeLessThanOrEqual(30);
  });

  test("a merged PR costs no checks call", () => {
    const runner = sequencedRunner([]);
    const report = buildReport(ghClient("/repo", runner), { ...UNKNOWN, state: "MERGED" }, { externalPatterns: [], defaultBranch: "main" });
    expect(report.state).toBe("merged");
    expect(runner.calls).toEqual([]);
  });

  test("every failed or cancelled job's log is read once and saved; each gets its own facts", () => {
    const dir = mkdtempSync(join(tmpdir(), "report-logs-"));
    const run = 36796809320;
    const failing = [
      check({ name: "Backend Tests", bucket: "fail", runId: run, jobId: 110162211428 }),
      ...Array.from({ length: 4 }, (_, index) => check({ name: `Job ${index}`, bucket: "fail", runId: run, jobId: index })),
      check({ name: "E2E Tests", bucket: "cancel", runId: run, jobId: 110162212390 }),
    ];
    const runner = sequencedRunner([
      [["gh", "api", "repos/{owner}/{repo}/actions/jobs/110162212390/logs"], [{ stdout: TIMEOUT_LOG }]],
      [["gh", "api"], [{ stdout: LOG }]],
      [RUN_DETAIL, [{ stdout: RUN_VIEW }]],
    ]);
    const gh = ghClient("/repo", runner);
    const report = buildReport(gh, prView({ checks: failing }), { externalPatterns: [], defaultBranch: undefined, jobLogs: savedJobLogs(gh.jobLog, dir) });

    expect(runner.calls.filter((call) => call[1] === "api")).toHaveLength(failing.length);
    expect(runner.calls.filter((call) => call[1] === "run")).toHaveLength(1);
    expect(report.failures.map((failure) => failure.check.name)).toEqual(failing.map((one) => one.name));
    expect(report.failures.every((failure) => failure.tail?.ok)).toBe(true);
    const e2e = report.failures.at(-1);
    expect(e2e?.logPath).toBe(jobLogFile(dir, 110162212390));
    expect(e2e?.infra).toEqual({ ok: true, value: { infra: false, reason: "cancelled after Backend Tests failed" } });
  });

  test("the triage gate is carried for the render", () => {
    const report = buildReport(ghClient("/repo", sequencedRunner([])), prView(), { externalPatterns: [], defaultBranch: undefined, triageGate: "ci-triage" });
    expect(report.triageGate).toBe("ci-triage");
  });
});
