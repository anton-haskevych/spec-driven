import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { realpathSync } from "node:fs";
import { gitAt } from "../core/git";
import { scanWorkspaces, type WorkspaceScanResult } from "../workspaces/scan";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { asyncStubRunner, stubRunner } from "./stub-runner";

describe("scanWorkspaces (real git)", () => {
  let repo: TestRepo;
  let scan: WorkspaceScanResult;
  let merged: string;
  let editing: string;

  beforeAll(async () => {
    repo = repoWithOrigin("spec-scan-");
    repo.write("docs/specs/alpha/CLAUDE.md", "# Alpha\n");
    repo.write("docs/specs/beta/CLAUDE.md", "# Beta\n");
    repo.commitAll("specs");
    repo.git("push", "-q", "origin", "main");
    const baseSha = repo.git("rev-parse", "origin/main");

    merged = realpathSync(repo.addWorktree("merged", "merged-branch").dir);
    const worktree = repo.addWorktree("editing", "edit-branch");
    worktree.write("docs/specs/beta/progress.md", "- [x] Phase 1\n");
    worktree.commitAll("beta progress");
    worktree.write("docs/specs/alpha/design.md", "draft\n");
    editing = realpathSync(worktree.dir);

    const result = await scanWorkspaces(gitAt(repo.dir, isolatedRunner), isolatedAsyncRunner, baseSha, new Set());
    if (!result.ok) throw new Error(result.reason);
    scan = result.value;
  });

  afterAll(() => repo.cleanup());

  test("scans the main checkout and the worktree with work, and counts the merged one", () => {
    expect(scan.scans.map((entry) => [entry.workspace.path, entry.specs])).toEqual([
      [realpathSync(repo.dir), []],
      [editing, ["alpha", "beta"]],
    ]);
    expect(scan.counts).toEqual({ merged: 1, unknownBase: 0, unreadable: 0 });
    expect(scan.scans.some((entry) => entry.workspace.path === merged)).toBe(false);
  });
});

describe("scanWorkspaces (stubbed git)", () => {
  const BASE = "b".repeat(40);
  const worktrees = "worktree /repo\nHEAD " + BASE + "\nbranch refs/heads/main\n\nworktree /w/old\nHEAD " + "o".repeat(40) + "\nbranch refs/heads/old\n\n";
  const git = gitAt("/repo", stubRunner([
    [["git", "--no-optional-locks", "worktree"], { stdout: worktrees }],
    [["git", "--no-optional-locks", "for-each-ref"], { stdout: "main 0 0\nold 3 10\n" }],
  ]));

  async function countsWhenDiffFails(mergeBaseExit: number) {
    const runner = asyncStubRunner([
      [["git", "--no-optional-locks", "diff"], { code: 128, stderr: "fatal: bad object" }],
      [["git", "--no-optional-locks", "status"], {}],
      [["git", "merge-base"], { code: mergeBaseExit }],
    ]);
    const result = await scanWorkspaces(git, runner, BASE, new Set());
    if (!result.ok) throw new Error(result.reason);
    return { counts: result.value.counts, scanned: result.value.scans.map((scan) => scan.workspace.path) };
  }

  test("a worktree whose diff fails and that shares no history with base is unknown-base", async () => {
    expect(await countsWhenDiffFails(1)).toEqual({ counts: { merged: 0, unknownBase: 1, unreadable: 0 }, scanned: ["/repo"] });
  });

  test("a worktree whose diff fails for any other reason is unreadable", async () => {
    expect(await countsWhenDiffFails(0)).toEqual({ counts: { merged: 0, unknownBase: 0, unreadable: 1 }, scanned: ["/repo"] });
  });

  test("fails as a whole only when the worktree list itself can't be read", async () => {
    const result = await scanWorkspaces(gitAt("/repo", stubRunner([])), asyncStubRunner([]), BASE, new Set());
    expect(result.ok).toBe(false);
  });
});
