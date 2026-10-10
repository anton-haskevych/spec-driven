import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ghClient } from "../pr/gh";
import { prView } from "./pr-factories";
import { sequencedRunner, stubRunner } from "./stub-runner";

const fixture = (name: string) => Bun.file(join(import.meta.dir, "fixtures", name)).text();
const UNKNOWN = prView({ mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" });
const PR_VIEW = JSON.stringify(UNKNOWN);
const ROLLUP_VIEW = await fixture("gh-pr-view-rollup-states.json");
const RUN_JOBS = await fixture("gh-run-jobs.json");
const RUN_LIST = await fixture("gh-run-list.json");
const RUN_VIEW = await fixture("gh-run-view.json");

describe("ghClient", () => {
  test("parses pr view, checks, jobs and runs into typed records", () => {
    const gh = ghClient("/repo", stubRunner([
      [["gh", "pr", "view", "875"], { stdout: PR_VIEW }],
      [["gh", "run", "view", "36796809320", "--json", "jobs"], { stdout: RUN_JOBS }],
      [["gh", "run", "view", "36796809320", "--json", "workflowDatabaseId"], { stdout: RUN_JOBS }],
      [["gh", "run", "list"], { stdout: RUN_LIST }],
    ]));
    expect(gh.prView(875)).toEqual({ ok: true, value: UNKNOWN });
    const withChecks = ghClient("/repo", stubRunner([[["gh", "pr", "view"], { stdout: ROLLUP_VIEW }]])).prView(875);
    const checks = withChecks.ok ? withChecks.value.checks : [];
    expect(checks.find((check) => check.name === "Vercel – site-a")).toMatchObject({ bucket: "queued", workflow: "" });
    expect(checks.find((check) => check.name === "Backend Tests")).toMatchObject({ bucket: "fail", runId: 36796809320, jobId: 110162211428, completedAt: "2026-10-01T17:09:03Z" });
    expect(gh.runJobs(36796809320)).toMatchObject({ ok: true, value: [{ name: "Ops Tests" }, { name: "Backend Tests", id: 110162211428, conclusion: "failure" }, { name: "Landing Tests" }] });
    expect(gh.runWorkflowId(36796809320)).toEqual({ ok: true, value: 208544398 });
    expect(gh.branchRuns("main", 208544398, 15)).toMatchObject({ ok: true, value: [{ id: 36715144973, conclusion: "success" }, {}, {}] });
  });

  test("run reads the run's status, conclusion, attempt and jobs in one call", () => {
    const runner = stubRunner([[["gh", "run", "view", "36796809320", "--json", "status,conclusion,attempt,jobs"], { stdout: RUN_VIEW }]]);
    const gh = ghClient("/repo", runner);
    expect(gh.run(36796809320)).toMatchObject({
      ok: true,
      value: { id: 36796809320, status: "completed", conclusion: "failure", attempt: 1, jobs: [{ name: "Ops Tests" }, { id: 110162211428, conclusion: "failure" }, { name: "E2E Tests", conclusion: "cancelled" }] },
    });
    gh.run(36796809320);
    expect(runner.calls).toHaveLength(1);
  });

  test("pr view carries the head branch and, once merged, the merge commit", () => {
    const merged = JSON.stringify({ ...prView({ state: "MERGED" }), headRefName: "feat/x-pr-a", mergeCommit: { oid: "9b0c1d2e3f" } });
    const gh = ghClient("/repo", stubRunner([[["gh", "pr", "view"], { stdout: merged }]]));
    expect(gh.prView(875)).toMatchObject({ ok: true, value: { headRefName: "feat/x-pr-a", mergeCommit: "9b0c1d2e3f" } });
    expect(ghClient("/repo", stubRunner([[["gh", "pr", "view"], { stdout: PR_VIEW }]])).prView(875)).toEqual({ ok: true, value: UNKNOWN });
  });

  test("commitRuns lists the head's runs, uncached, so a poll sees new ones", () => {
    const runs = (rows: object[]) => ({ stdout: JSON.stringify(rows) });
    const runner = sequencedRunner([[["gh", "run", "list", "--commit", "1a2b3c4d"], [runs([]), runs([{ databaseId: 3788, status: "queued", conclusion: "" }])]]]);
    const gh = ghClient("/repo", runner);
    expect(gh.commitRuns("1a2b3c4d")).toEqual({ ok: true, value: [] });
    expect(gh.commitRuns("1a2b3c4d")).toEqual({ ok: true, value: [{ id: 3788, status: "queued", conclusion: "" }] });
    expect(runner.calls[0]).toEqual(["gh", "run", "list", "--commit", "1a2b3c4d", "--limit", "50", "--json", "databaseId,status,conclusion"]);
  });

  test("a gh failure comes back as the first stderr line", () => {
    const gh = ghClient("/repo", stubRunner([[["gh", "pr", "view"], { code: 1, stderr: 'no pull requests found for branch "x"\nmore' }]]));
    expect(gh.prView()).toEqual({ ok: false, reason: 'no pull requests found for branch "x"' });
  });

  test("run lookups are fetched once", () => {
    const runner = stubRunner([[["gh", "run", "view"], { stdout: RUN_JOBS }]]);
    const gh = ghClient("/repo", runner);
    gh.runJobs(1);
    gh.runJobs(1);
    gh.runWorkflowId(1);
    expect(runner.calls).toHaveLength(2);
  });

  test("stops calling gh once the budget is spent", () => {
    const runner = stubRunner([[["gh", "api"], { stdout: "log" }]]);
    const gh = ghClient("/repo", runner, 2);
    expect(gh.jobLog(1).ok).toBe(true);
    expect(gh.jobLog(2).ok).toBe(true);
    expect(gh.jobLog(3)).toEqual({ ok: false, reason: "gh call budget (2) spent" });
    expect(runner.calls).toHaveLength(2);
  });
});
