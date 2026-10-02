import { describe, expect, test } from "bun:test";
import { pruneCandidates, type TreeFacts } from "../trees/prune-rules";
import type { Workspace } from "../workspaces/list";

const facts = (path: string, head: string, branch: string | undefined, extra: Partial<Omit<TreeFacts, "worktree">> = {}): TreeFacts => ({
  worktree: { path, head, ...(branch ? { branch } : {}), detached: !branch, locked: false, prunable: false, isMain: false } satisfies Workspace,
  inBase: false,
  clean: true,
  ...extra,
});
const merged = new Map([["feat/squashed", [{ number: 8, head: "s1" }]]]);

describe("pruneCandidates", () => {
  test("a clean, idle tree whose head is in base or is a merged PR's head", () => {
    const candidates = pruneCandidates([facts("/t/a", "a1", "feat/a", { inBase: true }), facts("/t/s", "s1", "feat/squashed"), facts("/t/codex", "c1", undefined, { inBase: true })], merged, "main");
    expect(candidates).toEqual([
      { path: "/t/a", branch: "feat/a", evidence: "in origin/main" },
      { path: "/t/s", branch: "feat/squashed", evidence: "#8 merged" },
      { path: "/t/codex", evidence: "in origin/main" },
    ]);
  });

  test("commits after the merged PR's head are unpushed work: kept", () => {
    expect(pruneCandidates([facts("/t/s", "s2", "feat/squashed")], merged, "main")).toEqual([]);
  });

  test("dirty or busy trees are kept, whatever their branch", () => {
    expect(pruneCandidates([facts("/t/a", "a1", "feat/a", { inBase: true, clean: false }), facts("/t/b", "b1", "feat/b", { inBase: true, busy: "after x 1" })], merged, "main")).toEqual([]);
  });

  test("without PR data only base ancestry counts", () => {
    expect(pruneCandidates([facts("/t/s", "s1", "feat/squashed")], undefined, "main")).toEqual([]);
  });
});
