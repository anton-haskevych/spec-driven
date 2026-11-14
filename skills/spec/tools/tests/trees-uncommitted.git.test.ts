import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { hasUncommittedChanges } from "../trees/uncommitted";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

describe("hasUncommittedChanges", () => {
  let repo: TestRepo;

  beforeAll(() => {
    repo = repoWithOrigin("spec-trees-uncommitted-");
    repo.write("README.md", "base");
    repo.commitAll("readme");
  });
  afterAll(() => repo.cleanup());

  test("a tree matching its last commit has none", () => {
    expect(hasUncommittedChanges(repo.addWorktree("clean", "feat/clean").dir, isolatedRunner)).toBe(false);
  });

  test("an edited tracked file or a new untracked file counts", () => {
    const edited = repo.addWorktree("edited", "feat/edited");
    edited.write("README.md", "edited, not committed");
    const added = repo.addWorktree("added", "feat/added");
    added.write("notes/scratch.md", "untracked");
    expect(hasUncommittedChanges(edited.dir, isolatedRunner)).toBe(true);
    expect(hasUncommittedChanges(added.dir, isolatedRunner)).toBe(true);
  });

  test("a tree it can't read counts as changed, so placement refuses rather than guesses", () => {
    expect(hasUncommittedChanges(join(repo.root, "missing"), isolatedRunner)).toBe(true);
  });
});
