import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ghClient } from "../pr/gh";
import { stubRunner } from "./stub-runner";

const fixture = (name: string) => Bun.file(join(import.meta.dir, "fixtures", name)).text();
const PR_VIEW = '{"headRefOid":"08bb7dbd47fa14537ef4","isDraft":false,"mergeStateStatus":"UNKNOWN","mergeable":"UNKNOWN","number":875,"state":"OPEN"}';
const CHECKS = await fixture("gh-pr-checks.json");
const RUN_JOBS = await fixture("gh-run-jobs.json");
const RUN_LIST = await fixture("gh-run-list.json");

describe("ghClient", () => {
  test("parses pr view, checks, jobs and runs into typed records", () => {
    const gh = ghClient("/repo", stubRunner([
      [["gh", "pr", "view", "875"], { stdout: PR_VIEW }],
      [["gh", "pr", "checks", "875"], { stdout: CHECKS, code: 1 }],
      [["gh", "run", "view", "36796809320", "--json", "jobs"], { stdout: RUN_JOBS }],
      [["gh", "run", "view", "36796809320", "--json", "workflowDatabaseId"], { stdout: RUN_JOBS }],
      [["gh", "run", "list"], { stdout: RUN_LIST }],
    ]));
    expect(gh.prView(875)).toEqual({ ok: true, value: { number: 875, state: "OPEN", isDraft: false, mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN", headRefOid: "08bb7dbd47fa14537ef4" } });
    const checks = gh.prChecks(875);
    expect(checks.ok && checks.value.find((check) => check.name === "Vercel – site-a")).toMatchObject({ bucket: "pending", workflow: "" });
    expect(gh.runJobs(36796809320)).toMatchObject({ ok: true, value: [{ name: "Ops Tests" }, { name: "Backend Tests", id: 110162211428, conclusion: "failure" }, { name: "Landing Tests" }] });
    expect(gh.runWorkflowId(36796809320)).toEqual({ ok: true, value: 208544398 });
    expect(gh.branchRuns("main", 208544398, 15)).toMatchObject({ ok: true, value: [{ id: 36715144973, conclusion: "success" }, {}, {}] });
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
