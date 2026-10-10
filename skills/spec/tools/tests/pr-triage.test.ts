import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { Job, RunDetail } from "../pr/checks/types";
import { infraFact, infraFromLog } from "../pr/failures/triage";

const fixture = (name: string) => Bun.file(join(import.meta.dir, "fixtures", name)).text();
const TEST_FAILURE_LOG = await fixture("gh-job-log.txt");
const TIMEOUT_LOG = await fixture("gh-job-log-timeout.txt");
const RUNNER_LOST_LOG = await fixture("gh-job-log-runner-lost.txt");

const JOB = 9921;
const job = (conclusion: string, id = JOB, name = "E2E Tests"): Job => ({ id, name, conclusion });
const run = (jobs: Job[], conclusion = "failure"): RunDetail => ({ id: 3788, status: "completed", conclusion, attempt: 1, jobs });

describe("infraFact", () => {
  test.each([
    ["a test failure", run([job("failure")]), TEST_FAILURE_LOG, { infra: false }],
    ["a run that never started", run([job("failure")], "startup_failure"), undefined, { infra: true, reason: "never started" }],
    ["a job that never started", run([job("startup_failure")]), undefined, { infra: true, reason: "never started" }],
    ["the runner lost", run([job("failure")]), RUNNER_LOST_LOG, { infra: true, reason: "runner lost" }],
    ["a shutdown signal", run([job("failure")]), "##[error]The runner has received a shutdown signal. This can happen when the runner service is stopped", { infra: true, reason: "runner shut down" }],
    ["a full disk", run([job("failure")]), "write /tmp/x: No space left on device", { infra: true, reason: "disk full" }],
    ["a job never acquired", run([job("failure")]), "The job was not acquired by Runner of type hosted even after multiple attempts", { infra: true, reason: "no runner" }],
    ["cancelled alone", run([job("cancelled"), job("success", 1, "Lint")], "cancelled"), "##[error]The operation was canceled.", { infra: true, reason: "cancelled" }],
    ["cancelled by its own timeout", run([job("cancelled")], "cancelled"), TIMEOUT_LOG, { infra: false, reason: "timed out" }],
    ["cancelled by fail-fast after a sibling failed", run([job("cancelled"), job("failure", 2, "E2E Tests (2/2)")]), "##[error]The operation was canceled.", { infra: false, reason: "cancelled after E2E Tests (2/2) failed" }],
    ["cancelled with no log to rule out a timeout", run([job("cancelled")], "cancelled"), undefined, { infra: false, reason: "cancelled; no log to rule out a timeout" }],
  ] as const)("%s", (_name, detail, log, expected) => {
    expect(infraFact(JOB, detail, log)).toEqual(expected);
  });

  test("without the log, only a job that never started can be told apart; anything else is unknown", () => {
    const noLog = { ok: false as const, reason: "gh call budget (30) spent" };
    expect(infraFromLog(JOB, run([job("failure")]), noLog)).toEqual({ ok: false, reason: "no log (gh call budget (30) spent)" });
    expect(infraFromLog(JOB, run([job("startup_failure")]), noLog)).toEqual({ ok: true, value: { infra: true, reason: "never started" } });
    expect(infraFromLog(JOB, run([job("failure")]), { ok: true, value: RUNNER_LOST_LOG })).toEqual({ ok: true, value: { infra: true, reason: "runner lost" } });
  });

  test("signatures are found anywhere in the log, not only in the tail", () => {
    const log = `The hosted runner: GitHub Actions 7 lost communication with the server.\n${"noise\n".repeat(500)}##[error]Process completed with exit code 1.`;
    expect(infraFact(JOB, run([job("failure")]), log)).toEqual({ infra: true, reason: "runner lost" });
  });
});
