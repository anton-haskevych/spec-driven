import { describe, expect, test } from "bun:test";
import { ownerOf } from "../workspaces/owner";

describe("ownerOf", () => {
  const paths = ["/repo", "/repo/.claude/worktrees/a", "/trees/b"];

  test("the deepest worktree holding the path owns it, so in-repo trees win over the main checkout", () => {
    expect(ownerOf("/repo/.claude/worktrees/a/src", paths)).toBe("/repo/.claude/worktrees/a");
    expect(ownerOf("/repo/src", paths)).toBe("/repo");
    expect(ownerOf("/trees/b", paths)).toBe("/trees/b");
  });

  test("matches whole path segments only", () => {
    expect(ownerOf("/trees/b-2", paths)).toBeUndefined();
    expect(ownerOf("/elsewhere", paths)).toBeUndefined();
  });
});
