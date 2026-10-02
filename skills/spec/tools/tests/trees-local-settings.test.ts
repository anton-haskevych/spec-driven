import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Workspace } from "../workspaces/list";
import { detectTreeRoot, treeRoot } from "../trees/local-settings";
import { createTree, type Tree } from "./tree";

const worktree = (path: string, extra: Partial<Workspace> = {}): Workspace => ({ path, head: "abc", detached: false, locked: false, prunable: false, isMain: false, ...extra });

describe("detectTreeRoot", () => {
  test("the folder holding the most trees wins; the main checkout and pruned trees don't count", () => {
    const worktrees = [
      worktree("/repo", { isMain: true }),
      worktree("/home/claude-worktrees/crm/a"),
      worktree("/home/claude-worktrees/crm/b"),
      worktree("/repo/.claude/worktrees/c"),
      worktree("/gone/d", { prunable: true }),
      worktree("/gone/e", { prunable: true }),
      worktree("/gone/f", { prunable: true }),
    ];
    expect(detectTreeRoot(worktrees, "/default")).toEqual({ root: "/home/claude-worktrees/crm", trees: 2 });
  });

  test("no trees yet → the default root", () => {
    expect(detectTreeRoot([worktree("/repo", { isMain: true })], "/default")).toEqual({ root: "/default", trees: 0 });
  });
});

describe("treeRoot", () => {
  let commonDir: Tree;
  afterEach(() => commonDir.cleanup());
  const settingsFile = () => join(commonDir.root, "spec-driven", "local.md");

  test("first use records the detected root and says so once", () => {
    commonDir = createTree("spec-trees-common-");
    const worktrees = [worktree("/repo", { isMain: true }), worktree("/trees/crm/a")];
    const first = treeRoot(commonDir.root, worktrees, { defaultRoot: "/default", home: "/home" });
    expect(first).toEqual({ ok: true, value: { root: "/trees/crm", notice: 'Trees: /trees/crm (detected from 1 tree; say "put my trees in X" to change)' } });
    expect(readFileSync(settingsFile(), "utf8")).toStartWith('---\nworktrees:\n  root: "/trees/crm"\n---\n');
    expect(treeRoot(commonDir.root, [], { defaultRoot: "/default", home: "/home" })).toEqual({ ok: true, value: { root: "/trees/crm" } });
  });

  test("a root the person set wins, with ~ expanded", () => {
    commonDir = createTree("spec-trees-common-");
    commonDir.write("spec-driven/local.md", "---\nworktrees:\n  root: ~/elsewhere\n---\n");
    expect(treeRoot(commonDir.root, [], { defaultRoot: "/default", home: "/home" })).toEqual({ ok: true, value: { root: "/home/elsewhere" } });
  });

  test("a file without a root is never overwritten; the notice names it", () => {
    commonDir = createTree("spec-trees-common-");
    commonDir.write("spec-driven/local.md", "---\nother: 1\n---\n");
    const placed = treeRoot(commonDir.root, [], { defaultRoot: "/default", home: "/home" });
    expect(placed).toEqual({ ok: true, value: { root: "/default", notice: `Trees: /default (default, no trees yet; ${settingsFile()} has no worktrees.root)` } });
    expect(readFileSync(settingsFile(), "utf8")).toBe("---\nother: 1\n---\n");
  });
});
