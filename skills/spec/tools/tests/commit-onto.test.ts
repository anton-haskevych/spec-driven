import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import { commitOnto } from "../publish/commit-onto";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

describe("commitOnto (real git)", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = repoWithOrigin("spec-commit-onto-");
    repo.write("a.md", "a\n");
    repo.write("b.md", "b\n");
    repo.commitAll("two files");
  });

  afterEach(() => repo.cleanup());

  test("commits the index-info entries onto base, leaving every other path and the checkout alone", () => {
    const base = repo.git("rev-parse", "HEAD");
    const written = gitAt(repo.dir, isolatedRunner).out(["hash-object", "-w", "--stdin"], { stdin: "changed\n" });
    if (!written.ok) throw new Error(written.reason);

    const commit = commitOnto(gitAt(repo.dir, isolatedRunner), base, `100644 blob ${written.value}\ta.md\0`, "edit a");
    if (!commit.ok) throw new Error(commit.reason);
    expect(repo.git("rev-parse", `${commit.value}^`)).toBe(base);
    expect(repo.git("show", `${commit.value}:a.md`)).toBe("changed");
    expect(repo.git("show", `${commit.value}:b.md`)).toBe("b");
    expect(repo.git("log", "-1", "--format=%s", commit.value)).toBe("edit a");
    expect(repo.git("rev-parse", "HEAD")).toBe(base);
    expect(repo.git("status", "--porcelain")).toBe("");
  });
});
