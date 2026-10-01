import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { loadBoardInputs, repoName } from "../board/load";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

describe("loadBoardInputs (real git)", () => {
  let repo: TestRepo;
  let worktree: string;

  beforeAll(() => {
    repo = repoWithOrigin("spec-board-inputs-");
    repo.write("docs/specs/a/CLAUDE.md", "---\nstatus: active\n---\n");
    repo.write("docs/specs/a/progress.md", "- [ ] Phase 1 — One → `phases/phase-1-one.md`\n");
    repo.write("docs/specs/_backlog/idea.md", "---\ntitle: An idea\n---\n");
    repo.commitAll("specs");
    repo.git("push", "-q", "origin", "main");
    worktree = join(repo.root, "wt");
    repo.git("worktree", "add", "-q", "-b", "wt", worktree);
    repo.write("../wt/docs/specs/a/progress.md", "- [x] Phase 1 — One → `phases/phase-1-one.md`\n");
  });

  afterAll(() => repo.cleanup());

  test("reads the same base from the main checkout and from a worktree with local edits", async () => {
    const fromMain = await loadBoardInputs(repo.dir, { local: true }, isolatedRunner);
    const fromWorktree = await loadBoardInputs(worktree, { local: true }, isolatedRunner);
    if (!fromMain.ok || !fromWorktree.ok) throw new Error(JSON.stringify([fromMain, fromWorktree]));

    expect(fromMain.value.repo).toBe("work");
    expect(fromWorktree.value.repo).toBe("work");
    expect(fromWorktree.value.base).toEqual(fromMain.value.base);
    expect(fromWorktree.value.states.get("a")?.phases[0]?.done).toBe(false);
    expect(fromMain.value.backlogCount).toBe(1);
  });
});

describe("repoName", () => {
  test("names the repo from its common dir, for a normal clone and for a bare one", () => {
    expect(repoName("/Users/a/IdeaProjects/crm/.git")).toBe("crm");
    expect(repoName("/Users/a/repos/crm.git")).toBe("crm");
  });
});
