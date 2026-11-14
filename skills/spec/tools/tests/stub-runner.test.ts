import { describe, expect, test } from "bun:test";
import { gitStub, notARepoRunner, strictRunner } from "./stub-runner";

describe("notARepoRunner", () => {
  test("answers every git command the way git does outside a repository", () => {
    expect(notARepoRunner.run(["git", "remote", "get-url", "origin"])).toEqual({ code: 128, stdout: "", stderr: "fatal: not a git repository (or any of the parent directories): .git" });
  });

  test("refuses to stand in for anything but git", () => {
    expect(() => notARepoRunner.run(["gh", "pr", "view"])).toThrow("notARepoRunner only answers git, not: gh pr view");
  });
});

describe("strictRunner", () => {
  test("answers an argv it was given exactly, and records the call", () => {
    const runner = strictRunner([[["git", "remote"], { stdout: "origin\n" }]]);
    expect(runner.run(["git", "remote"])).toEqual({ code: 0, stdout: "origin\n", stderr: "" });
    expect(runner.calls).toEqual([["git", "remote"]]);
  });

  test("throws on any other argv, a longer one included, so code under test can't take a fallback", () => {
    const runner = strictRunner([[["git", "remote"], { stdout: "origin\n" }]]);
    expect(() => runner.run(["git", "remote", "get-url", "origin"])).toThrow("no answer for: git remote get-url origin");
  });
});

describe("gitStub", () => {
  const stub = gitStub({ commonDir: "/repo/.git", toplevel: "/repo" });
  const out = (...argv: string[]) => stub.run(["git", ...argv]).stdout.trim();

  test("answers what a checkout tells about itself", () => {
    expect(out("rev-parse", "--path-format=absolute", "--git-common-dir")).toBe("/repo/.git");
    expect(out("rev-parse", "--show-toplevel")).toBe("/repo");
    expect(out("symbolic-ref", "--short", "refs/remotes/origin/HEAD")).toBe("origin/main");
    expect(out("branch", "--show-current")).toBe("feat/x");
    expect(out("rev-parse", "HEAD")).toMatch(/^[0-9a-f]{40}$/);
    expect(out("var", "GIT_AUTHOR_IDENT")).toStartWith("spec-tests <");
    expect(out("-c", "user.useConfigOnly=true", "-c", "user.email=spec-driven@invalid", "var", "GIT_AUTHOR_IDENT")).toStartWith("spec-tests <");
  });

  test("a clean tree with nothing unpushed", () => {
    expect(out("--no-optional-locks", "status", "--porcelain", "-z", "--untracked-files=normal")).toBe("");
    expect(out("rev-list", "--count", "HEAD", "--not", "--remotes")).toBe("0");
  });

  test("no default branch: origin/HEAD is unset and gh can't say either", () => {
    const none = gitStub({ commonDir: "/repo/.git", defaultBranch: null });
    expect(none.run(["git", "symbolic-ref", "--short", "refs/remotes/origin/HEAD"]).code).not.toBe(0);
    expect(none.run(["gh", "repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"]).code).not.toBe(0);
  });

  test("extra answers come first; origin itself is a seam, never a stub answer", () => {
    const extra = gitStub({ commonDir: "/repo/.git", answers: [[["git", "rev-parse", "HEAD"], { stdout: "abc\n" }]] });
    expect(extra.run(["git", "rev-parse", "HEAD"]).stdout).toBe("abc\n");
    expect(() => extra.run(["git", "remote", "get-url", "origin"])).toThrow("no answer for: git remote get-url origin");
  });
});
