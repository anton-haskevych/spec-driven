import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseWorktreeList } from "../workspaces/list";

const porcelain = await Bun.file(join(import.meta.dir, "fixtures", "git-worktree-list.txt")).text();

describe("parseWorktreeList", () => {
  const workspaces = parseWorktreeList(porcelain);

  test("lists every entry, the main checkout first and only", () => {
    expect(workspaces).toHaveLength(11);
    expect(workspaces.filter((workspace) => workspace.isMain).map((workspace) => workspace.path)).toEqual(["/Users/dev/crm"]);
    expect(workspaces[0]?.isMain).toBe(true);
  });

  test("reads a branch entry with its short branch name", () => {
    expect(workspaces[3]).toEqual({
      path: "/Users/dev/claude-worktrees/crm/alert-noise-cleanup-pr-a",
      head: "a291d728462336e4add2332b4daaeada8f53dd0a",
      branch: "feat/alert-noise-cleanup-pr-a",
      detached: false,
      locked: false,
      prunable: false,
      isMain: false,
    });
  });

  test("reads a detached entry without a branch", () => {
    const detached = workspaces[1];
    expect(detached?.detached).toBe(true);
    expect(detached?.branch).toBeUndefined();
    expect(detached?.head).toBe("bbc490fa33d87b0c707933c0a1187523c4805e37");
  });

  test("reads locked with or without a reason, and prunable", () => {
    const byName = (name: string) => workspaces.find((workspace) => workspace.path.endsWith(`/${name}`));
    expect(byName("locked-no-reason")?.locked).toBe(true);
    expect(byName("locked-with-reason")?.locked).toBe(true);
    expect(byName("gone")).toMatchObject({ prunable: true, detached: true, locked: false });
  });

  test("skips a bare main repository, which has no checkout", () => {
    const bare = "worktree /srv/repo.git\nbare\n\nworktree /srv/wt\nHEAD abc\nbranch refs/heads/x\n\n";
    expect(parseWorktreeList(bare)).toEqual([
      { path: "/srv/wt", head: "abc", branch: "x", detached: false, locked: false, prunable: false, isMain: false },
    ]);
  });

  test("returns nothing for empty output", () => {
    expect(parseWorktreeList("")).toEqual([]);
  });
});
