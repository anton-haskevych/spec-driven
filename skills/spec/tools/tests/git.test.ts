import { describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import { stubRunner } from "./stub-runner";

describe("gitAt", () => {
  test("runs git in the directory and returns trimmed stdout", () => {
    const runner = stubRunner([[["git", "rev-parse", "HEAD"], { stdout: "abc123\n" }]]);
    expect(gitAt("/repo", runner).out(["rev-parse", "HEAD"])).toEqual({ ok: true, value: "abc123" });
    expect(runner.calls).toEqual([["git", "rev-parse", "HEAD"]]);
  });

  test("a failure names the git sub-command and the first stderr line", () => {
    const runner = stubRunner([[["git", "push"], { code: 1, stderr: "fatal: no remote\nhint: add one\n" }]]);
    expect(gitAt("/repo", runner).out(["push", "origin"])).toEqual({ ok: false, reason: "git push failed: fatal: no remote" });
  });
});
