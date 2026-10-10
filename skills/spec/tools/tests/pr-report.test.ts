import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { RunResult, Runner } from "../core/run";
import { ghClient } from "../pr/gh";
import { buildReport, TAILS_SHOWN } from "../pr/report";
import type { PrView } from "../pr/checks/types";

const fixture = (name: string) => Bun.file(join(import.meta.dir, "fixtures", name)).text();
const CHECKS = await fixture("gh-pr-checks.json");
const RUN_JOBS = await fixture("gh-run-jobs.json");
const RUN_LIST = await fixture("gh-run-list.json");
const LOG = await fixture("gh-job-log.txt");
const UNKNOWN: PrView = { number: 875, state: "OPEN", isDraft: false, mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN", headRefOid: "08bb7dbd" };

// Answers each argv prefix from a queue, so a repeated call can get a different reply.
function sequencedRunner(replies: Array<[readonly string[], Partial<RunResult>[]]>): Runner & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    run(argv) {
      calls.push([...argv]);
      const entry = replies.find(([prefix]) => prefix.every((part, index) => argv[index] === part));
      const reply = entry && (entry[1].length > 1 ? entry[1].shift() : entry[1][0]);
      return { code: 0, stdout: "", stderr: "", ...(reply ?? { code: 1, stderr: "no canned result" }) };
    },
  };
}

describe("buildReport", () => {
  test("re-polls mergeability once, then reports failing jobs with tail and main comparison", () => {
    const runner = sequencedRunner([
      [["gh", "pr", "view"], [{ stdout: JSON.stringify({ ...UNKNOWN, mergeable: "MERGEABLE", mergeStateStatus: "UNSTABLE" }) }]],
      [["gh", "pr", "checks"], [{ stdout: CHECKS }]],
      [["gh", "api"], [{ stdout: LOG }]],
      [["gh", "run", "view"], [{ stdout: RUN_JOBS }]],
      [["gh", "run", "list"], [{ stdout: RUN_LIST }]],
    ]);
    const report = buildReport(ghClient("/repo", runner), UNKNOWN, { externalPatterns: ["Vercel*"], defaultBranch: "main" });

    expect(report.view.mergeStateStatus).toBe("UNSTABLE");
    expect(report.state).toBe("red");
    expect(report.failures.map((failure) => failure.check.name)).toEqual(["Backend Tests", "Backend Test Results"]);
    const [backend, results] = report.failures;
    expect(backend?.tail?.ok && backend.tail.value.at(-1)).toBe("##[error]Process completed with exit code 1.");
    expect(backend?.main).toMatchObject({ kind: "ran", conclusion: "failure" });
    expect(results?.job).toBeUndefined();
    expect(runner.calls.length).toBeLessThanOrEqual(30);
  });

  test("a merged PR costs no checks call", () => {
    const runner = sequencedRunner([]);
    const report = buildReport(ghClient("/repo", runner), { ...UNKNOWN, state: "MERGED" }, { externalPatterns: [], defaultBranch: "main" });
    expect(report.state).toBe("merged");
    expect(runner.calls).toEqual([]);
  });

  test("checks gh can't read leave the state unknown", () => {
    const runner = sequencedRunner([[["gh", "pr", "checks"], [{ code: 1, stderr: "HTTP 502" }]]]);
    const report = buildReport(ghClient("/repo", runner), { ...UNKNOWN, mergeable: "MERGEABLE" }, { externalPatterns: [], defaultBranch: "main" });
    expect(report).toMatchObject({ state: "unknown", checksError: "HTTP 502" });
  });

  test("fetches tails for the first few failures only; each log is a large download", () => {
    const failing = Array.from({ length: TAILS_SHOWN + 2 }, (_, index) => ({
      name: `Job ${index}`, bucket: "fail", workflow: "CI", link: `https://github.com/acme/app/actions/runs/1/job/${index}`,
    }));
    const runner = sequencedRunner([
      [["gh", "pr", "checks"], [{ stdout: JSON.stringify(failing) }]],
      [["gh", "api"], [{ stdout: LOG }]],
    ]);
    const report = buildReport(ghClient("/repo", runner), { ...UNKNOWN, mergeable: "MERGEABLE" }, { externalPatterns: [], defaultBranch: undefined });
    expect(runner.calls.filter((call) => call[1] === "api")).toHaveLength(TAILS_SHOWN);
    expect(report.failures.at(-1)?.tail).toEqual({ ok: false, reason: `only the first ${TAILS_SHOWN} failures get a tail` });
  });
});
