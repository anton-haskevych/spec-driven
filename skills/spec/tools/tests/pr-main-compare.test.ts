import { describe, expect, test } from "bun:test";
import type { GhClient, GhResult } from "../pr/gh";
import { compareOnMain, MAIN_RUNS_PER_JOB } from "../pr/main-compare";
import type { Job, WorkflowRun } from "../pr/types";

const unused = (): GhResult<never> => {
  throw new Error("not used by compareOnMain");
};

function fakeGh(runs: WorkflowRun[], jobsByRun: Record<number, Job[]>, workflowId: GhResult<number> = { ok: true, value: 7 }) {
  const calls: string[] = [];
  const gh: GhClient = {
    prView: unused,
    prChecks: unused,
    jobLog: unused,
    runWorkflowId: () => workflowId,
    branchRuns: (branch, id, limit) => {
      calls.push(`runs ${branch} ${id} ${limit}`);
      return { ok: true, value: runs };
    },
    runJobs: (runId) => {
      calls.push(`jobs ${runId}`);
      const jobs = jobsByRun[runId];
      return jobs ? { ok: true, value: jobs } : { ok: false, reason: "gh call budget (30) spent" };
    },
  };
  return { gh, calls };
}

const job = (conclusion: string): Job[] => [{ name: "Backend Tests", id: 1, conclusion }];
const run = (id: number, conclusion: string, createdAt = "2026-09-30T12:30:14Z"): WorkflowRun => ({ id, conclusion, createdAt });

describe("compareOnMain", () => {
  test("walks past skipped jobs and cancelled runs to the last real run", () => {
    const { gh, calls } = fakeGh(
      [run(3, "success"), run(2, "cancelled"), run(1, "failure", "2026-09-28T04:55:10Z")],
      { 3: job("skipped"), 1: job("failure") },
    );
    expect(compareOnMain(gh, { name: "Backend Tests", runId: 9 }, "main")).toEqual({ kind: "ran", runId: 1, day: "2026-09-28", conclusion: "failure" });
    expect(calls).toEqual([`runs main 7 ${MAIN_RUNS_PER_JOB}`, "jobs 3", "jobs 1"]);
  });

  test("reports how many runs it looked at when the job never ran", () => {
    const { gh } = fakeGh([run(2, "success"), run(1, "success")], { 2: job("skipped"), 1: [] });
    expect(compareOnMain(gh, { name: "Backend Tests", runId: 9 }, "main")).toEqual({ kind: "not-run", runs: 2 });
  });

  test("a spent budget or a gh failure says so instead of guessing", () => {
    const { gh } = fakeGh([run(2, "success")], {});
    expect(compareOnMain(gh, { name: "Backend Tests", runId: 9 }, "main")).toEqual({ kind: "unavailable", reason: "gh call budget (30) spent" });
    const noWorkflow = fakeGh([], {}, { ok: false, reason: "run not found" }).gh;
    expect(compareOnMain(noWorkflow, { name: "Backend Tests", runId: 9 }, "main")).toEqual({ kind: "unavailable", reason: "run not found" });
  });
});
