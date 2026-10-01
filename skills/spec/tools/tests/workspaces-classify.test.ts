import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { classifyWorkspaces, parseAheadBehind, suspectNoMergeBase, type WorkspaceFacts } from "../workspaces/classify";
import { parseWorktreeList, type Workspace } from "../workspaces/list";

const fixture = (name: string) => Bun.file(join(import.meta.dir, "fixtures", name)).text();
const workspaces = parseWorktreeList(await fixture("git-worktree-list.txt"));
const aheadBehind = parseAheadBehind(await fixture("git-for-each-ref.txt"));

const facts = (overrides: Partial<WorkspaceFacts> = {}): WorkspaceFacts => ({
  aheadBehind,
  unmergedDetached: new Set(),
  noMergeBase: new Set(),
  forceLive: new Set(),
  ...overrides,
});
const shortPath = (path: string) => path.replace(/^\/Users\/dev\/(claude-worktrees\/crm\/)?/, "");
const kinds = (classified: ReturnType<typeof classifyWorkspaces>) =>
  Object.fromEntries(classified.map(({ workspace, kind }) => [shortPath(workspace.path), kind]));

describe("parseAheadBehind", () => {
  test("reads ahead and behind counts per short branch name", () => {
    expect(aheadBehind.get("codex/homepage-focused-refresh")).toEqual({ ahead: 1, behind: 6223 });
    expect(aheadBehind.get("main")).toEqual({ ahead: 0, behind: 0 });
    expect(aheadBehind.size).toBe(10);
  });

  test("skips lines it cannot read", () => {
    expect([...parseAheadBehind("good 1 2\nbad line\n\nworse x y\n").keys()]).toEqual(["good"]);
  });
});

describe("classifyWorkspaces", () => {
  test("a branch with commits ahead of base is live; behind-only is merged; prunable is dropped", () => {
    expect(kinds(classifyWorkspaces(workspaces, facts()))).toEqual({
      crm: "live",
      ".codex/worktrees/09a8/crm": "merged",
      ".codex/worktrees/c0b4/crm": "live",
      "alert-noise-cleanup-pr-a": "merged",
      "analytics-reporting-foundation": "merged",
      "audience-routing-specs": "live",
      "ballroom-page-v1": "live",
      "e2e-code-quality-review": "live",
      "locked-no-reason": "merged",
      "locked-with-reason": "live",
    });
  });

  test("the main checkout is live even when it has nothing ahead, and has no commits to diff", () => {
    const [main] = classifyWorkspaces(workspaces, facts());
    expect(main).toMatchObject({ kind: "live", aheadOfBase: false });
  });

  test("a detached head is live only when rev-list says it is not on base", () => {
    const detachedHead = "bbc490fa33d87b0c707933c0a1187523c4805e37";
    const classified = classifyWorkspaces(workspaces, facts({ unmergedDetached: new Set([detachedHead]) }));
    expect(classified[1]).toMatchObject({ kind: "live", aheadOfBase: true });
  });

  test("forceLive keeps a merged worktree live, without commits to diff", () => {
    const path = "/Users/dev/claude-worktrees/crm/alert-noise-cleanup-pr-a";
    const classified = classifyWorkspaces(workspaces, facts({ forceLive: new Set([path]) }));
    expect(classified.find(({ workspace }) => workspace.path === path)).toMatchObject({ kind: "live", aheadOfBase: false });
  });

  test("a worktree with no merge base is unknown-base, even when forced live", () => {
    const path = "/Users/dev/claude-worktrees/crm/e2e-code-quality-review";
    const classified = classifyWorkspaces(workspaces, facts({ noMergeBase: new Set([path]), forceLive: new Set([path]) }));
    expect(classified.find(({ workspace }) => workspace.path === path)?.kind).toBe("unknown-base");
  });

  test("a branch for-each-ref did not report is unreadable", () => {
    const stray: Workspace = { path: "/w/stray", head: "abc", branch: "stray", detached: false, locked: false, prunable: false, isMain: false };
    expect(classifyWorkspaces([stray], facts())).toEqual([{ workspace: stray, kind: "unreadable", aheadOfBase: false }]);
  });
});

describe("suspectNoMergeBase", () => {
  test("names branch worktrees more than 1000 commits ahead, where a shallow clone loses the merge base", () => {
    expect(suspectNoMergeBase(workspaces, aheadBehind).map((workspace) => workspace.branch)).toEqual(["chore/e2e-code-quality-review"]);
  });
});
