import { describe, expect, test } from "bun:test";
import type { AsyncRunner, RunOptions } from "../core/run";
import { fetchPrLists, GH_TIMEOUT_MS } from "../pr/gh-lists";
import { asyncStubRunner } from "./stub-runner";

const OPEN = ["gh", "pr", "list", "--state", "open"];
const ALL = ["gh", "pr", "list", "--state", "all"];

describe("fetchPrLists", () => {
  test("runs the open and all-states lists in the project dir and returns both", async () => {
    const runner = asyncStubRunner([
      [OPEN, { stdout: '[{"number":1}]' }],
      [ALL, { stdout: '[{"number":2}]' }],
    ]);
    expect(await fetchPrLists("/repo", runner)).toEqual({ ok: true, value: { open: [{ number: 1 }], recent: [{ number: 2 }] } });
    expect(runner.calls.map((call) => call.cwd)).toEqual(["/repo", "/repo"]);
    expect(runner.calls[0]?.argv).toContain("number,headRefName,isDraft,url,statusCheckRollup");
    expect(runner.calls[1]?.argv).toContain("number,headRefName,state,mergedAt,url");
  });

  test("both calls carry the timeout", async () => {
    const seen: (number | undefined)[] = [];
    const runner: AsyncRunner = {
      async run(_argv, options: RunOptions = {}) {
        seen.push(options.timeoutMs);
        return { code: 0, stdout: "[]", stderr: "" };
      },
    };
    await fetchPrLists("/repo", runner);
    expect(seen).toEqual([GH_TIMEOUT_MS, GH_TIMEOUT_MS]);
  });

  test("a failing call fails the whole source with gh's first stderr line", async () => {
    const runner = asyncStubRunner([
      [OPEN, { code: 4, stderr: "gh auth login required\nmore" }],
      [ALL, { stdout: "[]" }],
    ]);
    expect(await fetchPrLists("/repo", runner)).toEqual({ ok: false, reason: "gh auth login required" });
  });

  test("a zero exit without a JSON array fails too", async () => {
    const runner = asyncStubRunner([
      [OPEN, { stdout: "[]" }],
      [ALL, { stdout: "not json" }],
    ]);
    expect(await fetchPrLists("/repo", runner)).toEqual({ ok: false, reason: "gh pr list gave no usable output" });
  });
});
