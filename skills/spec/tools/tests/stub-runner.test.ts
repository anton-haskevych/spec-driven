import { describe, expect, test } from "bun:test";
import { notARepoRunner } from "./stub-runner";

describe("notARepoRunner", () => {
  test("answers every git command the way git does outside a repository", () => {
    expect(notARepoRunner.run(["git", "remote", "get-url", "origin"])).toEqual({ code: 128, stdout: "", stderr: "fatal: not a git repository (or any of the parent directories): .git" });
  });

  test("refuses to stand in for anything but git", () => {
    expect(() => notARepoRunner.run(["gh", "pr", "view"])).toThrow("notARepoRunner only answers git, not: gh pr view");
  });
});
