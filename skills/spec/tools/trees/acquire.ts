import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Git } from "../core/git";
import type { Result } from "../core/result";
import { originTip, pinDefault } from "../publish/snapshot";
import type { TreeName } from "./naming";

export interface AddedTree {
  kind: "reused-branch" | "took-over" | "created";
  path: string;
  // Why the fetch failed when a new branch was cut from the last fetched origin.
  offline?: string;
}

// No tree has the branch yet. Never from local HEAD, never through the WorktreeCreate hook.
export function addTree(git: Git, name: TreeName, root: string, defaultBranch: string, fetchTimeoutMs: number): Result<AddedTree> {
  const path = freeFolder(root, name.folder);
  if (git.run(["show-ref", "--verify", "--quiet", `refs/heads/${name.branch}`]).code === 0) {
    return added(git.out(["worktree", "add", "-q", path, name.branch]), { kind: "reused-branch", path });
  }
  if (git.out(["fetch", "-q", "origin", name.branch], { timeoutMs: fetchTimeoutMs }).ok) {
    return added(git.out(["worktree", "add", "-q", "--track", "-b", name.branch, path, `origin/${name.branch}`]), { kind: "took-over", path });
  }
  const pinned = pinDefault(git, defaultBranch, { timeoutMs: fetchTimeoutMs });
  const base = pinned.ok ? pinned : originTip(git, defaultBranch);
  if (!base.ok || !base.value) return { ok: false, reason: `no origin/${defaultBranch} to branch from` };
  const created: AddedTree = { kind: "created", path, ...(pinned.ok ? {} : { offline: pinned.reason }) };
  return added(git.out(["worktree", "add", "-q", "-b", name.branch, path, base.value]), created);
}

function added(result: Result<string>, tree: AddedTree): Result<AddedTree> {
  return result.ok ? { ok: true, value: tree } : result;
}

function freeFolder(root: string, folder: string): string {
  let path = join(root, folder);
  for (let suffix = 2; existsSync(path); suffix += 1) path = join(root, `${folder}-${suffix}`);
  return path;
}
