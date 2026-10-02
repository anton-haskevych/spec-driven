import { describe, expect, test } from "bun:test";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { gitAt, gitCommonDir } from "../core/git";
import { isolatedRunner, repoWithOrigin } from "./git-repo";
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

describe("gitCommonDir", () => {
  test("is shared by the main checkout and its linked worktrees", () => {
    const repo = repoWithOrigin("spec-git-common-");
    try {
      const tree = repo.addWorktree("tree", "feat/tree");
      const expected = realpathSync(join(repo.dir, ".git"));
      expect(gitCommonDir(gitAt(repo.dir, isolatedRunner))).toEqual({ ok: true, value: expected });
      expect(gitCommonDir(gitAt(tree.dir, isolatedRunner))).toEqual({ ok: true, value: expected });
    } finally {
      repo.cleanup();
    }
  });
});
