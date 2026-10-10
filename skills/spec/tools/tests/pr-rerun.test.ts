import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { RunResult } from "../core/run";
import type { Check, Job, RunDetail } from "../pr/checks/types";
import { planRerun, rerunLine, type RerunCandidate } from "../pr/actions/rerun-plan";
import { rerunPr } from "../pr/actions/rerun";
import { prCommand } from "../commands/pr";
import { PR_RERUN_USAGE } from "../commands/pr/rerun";
import { readEvents } from "../pr/babysit/log";
import { check, ghPrViewJson } from "./pr-factories";
import { stubRunner } from "./stub-runner";
import { createTree, type Tree } from "./tree";

const run = (overrides: Partial<RunDetail> = {}, jobs: Job[] = []): RunDetail => ({ id: 3787, status: "completed", conclusion: "failure", attempt: 1, jobs, ...overrides });
const candidate = (name: string, jobId: number, fact: RerunCandidate["fact"], detail: RunDetail = run()): RerunCandidate => ({ check: check({ name, bucket: "fail" }), jobId, run: detail, fact });
const LOST = { infra: true, reason: "runner lost" } as const;

describe("planRerun", () => {
  test("infra failures are re-run, one entry per run, with the attempt they start", () => {
    const plan = planRerun([candidate("Backend Tests", 1, LOST), candidate("E2E Tests", 2, { infra: true, reason: "cancelled" }), candidate("Ops Tests", 3, LOST, run({ id: 3790, attempt: 2 }))]);
    expect(plan).toEqual({
      kind: "rerun",
      runs: [
        { runId: 3787, attempt: 1, jobs: [{ jobId: 1, name: "Backend Tests", reason: "runner lost" }, { jobId: 2, name: "E2E Tests", reason: "cancelled" }] },
        { runId: 3790, attempt: 2, jobs: [{ jobId: 3, name: "Ops Tests", reason: "runner lost" }] },
      ],
    });
    expect(plan.kind === "rerun" && plan.runs.map(rerunLine)).toEqual([
      "Backend Tests (runner lost), E2E Tests (cancelled) · attempt 2 of 3 · run 3787",
      "Ops Tests (runner lost) · attempt 3 of 3 · run 3790",
    ]);
  });

  test.each([
    ["a test failure, even beside an infra one", [candidate("Backend Tests", 1, LOST), candidate("E2E Tests", 2, { infra: false })], "pr rerun: E2E Tests failed in a test, not infra — fix it"],
    ["a timeout", [candidate("E2E Tests", 2, { infra: false, reason: "timed out" })], "pr rerun: E2E Tests timed out, not infra — fix it"],
    ["a fail-fast cancel", [candidate("E2E (1/2)", 2, { infra: false, reason: "cancelled after E2E (2/2) failed" })], "pr rerun: E2E (1/2) cancelled after E2E (2/2) failed, not infra — fix it"],
    ["a run still in progress", [candidate("Backend Tests", 1, LOST, run({ status: "in_progress" }))], "pr rerun: run 3787 still running — wait"],
    ["the third attempt", [candidate("Backend Tests", 1, LOST, run({ attempt: 3 }))], "pr rerun: run 3787 already ran 3 times (Backend Tests) — stop and ask"],
    ["nothing to re-run", [], "pr rerun: nothing failed or cancelled"],
  ] as const)("refuses %s", (_name, candidates, refusal) => {
    expect(planRerun(candidates)).toEqual({ kind: "refuse", reason: refusal });
  });
});

describe("rerunPr", () => {
  let tree: Tree;
  afterEach(() => tree?.cleanup());

  const link = (runId: number, jobId: number) => `https://github.com/acme/app/actions/runs/${runId}/job/${jobId}`;
  const failed = (name: string, runId: number, jobId: number, bucket: Check["bucket"] = "fail") => check({ name, bucket, link: link(runId, jobId), runId, jobId });
  const runJson = (detail: Omit<RunDetail, "id">) => JSON.stringify({ ...detail, jobs: detail.jobs.map((job) => ({ databaseId: job.id, name: job.name, conclusion: job.conclusion })) });

  function setup(checks: Check[], runDetail: Omit<RunDetail, "id">, log: string, rerunReply: Partial<RunResult> = { stdout: "" }) {
    tree = createTree();
    return stubRunner([
      [["gh", "pr", "view", "921"], { stdout: ghPrViewJson({ number: 921, headRefOid: "1a2b3c4d5e6f", checks }) }],
      [["gh", "run", "view"], { stdout: runJson(runDetail) }],
      [["gh", "api"], { stdout: log }],
      [["gh", "run", "rerun"], rerunReply],
      [["git", "rev-parse"], { stdout: `${join(tree.root, ".git")}\n` }],
    ]);
  }

  const now = () => new Date("2026-10-10T21:45:00Z");

  test("re-runs an infra failure, logs it, and prints the one result line", () => {
    const runner = setup([failed("Backend Tests", 3787, 9921)], { status: "completed", conclusion: "failure", attempt: 1, jobs: [{ id: 9921, name: "Backend Tests", conclusion: "failure" }] }, "The hosted runner: GitHub Actions 2 lost communication with the server.");
    expect(rerunPr(tree.root, ["921"], { runner, now })).toBe("Rerun: Backend Tests (runner lost) · attempt 2 of 3 · run 3787");
    expect(runner.calls.find((call) => call[2] === "rerun")).toEqual(["gh", "run", "rerun", "3787", "--job", "9921"]);
    const events = readEvents(join(tree.root, ".git", "spec-board", "babysit"), 921).events;
    expect(events).toEqual([{ at: "2026-10-10T21:45:00.000Z", event: "rerun", sha: "1a2b3c4", detail: "Backend Tests (runner lost) · attempt 2 of 3 · run 3787" }]);
  });

  test("a test failure is refused and nothing is written", () => {
    const runner = setup([failed("E2E Tests", 3788, 9922)], { status: "completed", conclusion: "failure", attempt: 1, jobs: [{ id: 9922, name: "E2E Tests", conclusion: "failure" }] }, "##[error] card-reader.spec.ts:41 Timeout 30000ms exceeded");
    expect(rerunPr(tree.root, ["921"], { runner, now })).toBe("pr rerun: E2E Tests failed in a test, not infra — fix it");
    expect(runner.calls.some((call) => call[2] === "rerun")).toBe(false);
  });

  test("the pr group dispatches rerun", async () => {
    tree = createTree();
    expect(await prCommand(tree.root, ["rerun", "1", "2", "3"])).toBe(`usage: ${PR_RERUN_USAGE}`);
  });

  test("GitHub's refusal is passed on", () => {
    const runner = setup([failed("Backend Tests", 3787, 9921, "cancel")], { status: "completed", conclusion: "cancelled", attempt: 1, jobs: [{ id: 9921, name: "Backend Tests", conclusion: "cancelled" }] }, "##[error]The operation was canceled.", {
      code: 1,
      stderr: "failed to rerun: HTTP 403: This workflow is already running\n",
    });
    expect(rerunPr(tree.root, ["921"], { runner, now })).toBe("pr rerun: failed to rerun: HTTP 403: This workflow is already running");
  });
});
