import { describe, expect, test } from "bun:test";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { authorName, gitAt, gitCommonDir, gitFailureReason, stateDir, stateDirIn } from "../core/git";
import { isolatedRunner, repoWithOrigin } from "./git-repo";
import { stubRunner } from "./stub-runner";

describe("gitAt", () => {
  test("runs git in the directory and returns trimmed stdout", () => {
    const runner = stubRunner([[["git", "rev-parse", "HEAD"], { stdout: "abc123\n" }]]);
    expect(gitAt("/repo", runner).out(["rev-parse", "HEAD"])).toEqual({ ok: true, value: "abc123" });
    expect(runner.calls).toEqual([["git", "rev-parse", "HEAD"]]);
  });

  test("a failure names the git sub-command and git's reason", () => {
    const runner = stubRunner([[["git", "push"], { code: 1, stderr: "fatal: no remote\nhint: add one\n" }]]);
    expect(gitAt("/repo", runner).out(["push", "origin"])).toEqual({ ok: false, reason: "git push failed: fatal: no remote" });
  });
});

describe("gitFailureReason", () => {
  test("a rejected push gives the rejection line, not the 'To <remote>' line git prints first", () => {
    const stderr = [
      "To https://github.com/anton-haskevych/spec-driven.git",
      " ! [rejected]        feat/x -> feat/x (non-fast-forward)",
      "error: failed to push some refs to 'https://github.com/anton-haskevych/spec-driven.git'",
      "hint: Updates were rejected because the tip of your current branch is behind",
    ].join("\n");
    expect(gitFailureReason(stderr)).toBe("! [rejected]        feat/x -> feat/x (non-fast-forward)");
  });

  test("otherwise the first fatal or error line, past progress chatter", () => {
    expect(gitFailureReason("remote: Enumerating objects: 5\nerror: src refspec main does not match any\n")).toBe("error: src refspec main does not match any");
  });

  test("a real rejected push says why", () => {
    const repo = repoWithOrigin("spec-git-rejected-");
    try {
      const other = repo.clone("other");
      other.write("theirs.md", "x");
      other.commitAll("theirs");
      other.git("push", "-q", "origin", "main");
      repo.write("ours.md", "y");
      repo.commitAll("ours");
      const pushed = gitAt(repo.dir, isolatedRunner).out(["push", "origin", "main"]);
      expect(pushed.ok).toBe(false);
      expect(!pushed.ok && pushed.reason).toMatch(/^git push failed: ! \[rejected\]\s+main -> main \(fetch first\)$/);
    } finally {
      repo.cleanup();
    }
  });

  test("with no marked line, the first line; nothing at all is empty", () => {
    expect(gitFailureReason("something odd\nmore\n")).toBe("something odd");
    expect(gitFailureReason("")).toBe("");
  });
});

describe("authorName", () => {
  test("is the name part of git's author identity", () => {
    const repo = repoWithOrigin("spec-git-author-");
    try {
      expect(authorName(gitAt(repo.dir, isolatedRunner))).toBe("spec-tests");
    } finally {
      repo.cleanup();
    }
  });

  test("is undefined when git can't say", () => {
    expect(authorName(gitAt("/repo", stubRunner([[["git", "var"], { code: 128, stderr: "fatal: no name" }]])))).toBeUndefined();  });
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

describe("stateDir", () => {
  test("is one folder of the common dir, so every worktree of a clone shares it", () => {
    const repo = repoWithOrigin("spec-git-state-");
    try {
      const tree = repo.addWorktree("tree", "feat/tree");
      const expected = join(realpathSync(join(repo.dir, ".git")), "spec-board", "babysit");
      expect(stateDir(gitAt(repo.dir, isolatedRunner), "babysit")).toEqual({ ok: true, value: expected });
      expect(stateDir(gitAt(tree.dir, isolatedRunner), "babysit")).toEqual({ ok: true, value: expected });
    } finally {
      repo.cleanup();
    }
  });

  test("passes git's failure through", () => {
    const git = gitAt("/nowhere", stubRunner([[["git", "rev-parse"], { code: 128, stderr: "fatal: not a git repository" }]]));
    expect(stateDir(git, "claims")).toEqual({ ok: false, reason: "git rev-parse failed: fatal: not a git repository" });
  });

  test("stateDirIn joins segments under spec-board", () => {
    expect(stateDirIn("/repo/.git", "base", "abc")).toBe("/repo/.git/spec-board/base/abc");
  });
});
