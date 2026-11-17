import { gitFailureReason, type Git } from "../core/git";
import { NETWORK } from "../core/remote-push";
import type { Result } from "../core/result";
import { MERGE_TREE_CONFLICT } from "./publish";
import { codeOnDefaultBranch, previewPaths } from "./push";
import { pinDefault } from "./snapshot";

export type MainSync =
  | { kind: "not-default"; branch: string }
  | { kind: "up-to-date"; branch: string }
  | { kind: "updated"; branch: string; commits: number; merged: boolean }
  | { kind: "refused"; branch: string; behind: number; reason: string };

// Brings the default branch, checked out here, up to origin's. Spec-doc commits of its own are merged the way
// publish-docs merges: origin's tip is the first parent, so origin's first-parent history stays its own once
// this is pushed. The merge is built off the checkout and reached by a fast-forward, so a conflict or a local
// edit in the way leaves the checkout exactly as it was. --no-autostash: with merge.autoStash set, git would
// "succeed" and leave conflict markers in the user's files.
export function syncMain(git: Git, defaultBranch: string): MainSync {
  const head = git.out(["symbolic-ref", "--short", "-q", "HEAD"]);
  const branch = head.ok ? head.value : "";
  if (branch !== defaultBranch) return { kind: "not-default", branch: branch || "a detached HEAD" };

  const refuse = (reason: string, behind = 0): MainSync => ({ kind: "refused", branch, behind, reason });
  const tip = pinDefault(git, defaultBranch, NETWORK);
  if (!tip.ok) return refuse(`can't reach origin (${tip.reason})`);
  const behind = count(git, `HEAD..${tip.value}`);
  const ahead = count(git, `${tip.value}..HEAD`);
  if (!behind.ok) return refuse(behind.reason);
  if (!ahead.ok) return refuse(ahead.reason, behind.value);
  if (behind.value === 0) return { kind: "up-to-date", branch };

  const code = ahead.value > 0 ? codeOnDefaultBranch(git, defaultBranch, `${tip.value}..HEAD`) : undefined;
  if (code) return refuse(code, behind.value);
  const target = ahead.value === 0 ? { ok: true as const, value: tip.value } : mergeCommit(git, tip.value, defaultBranch);
  if (!target.ok) return refuse(target.reason, behind.value);

  const moved = git.run(["merge", "-q", "--ff-only", "--no-autostash", target.value]);
  if (moved.code !== 0) return refuse(inTheWay(`${moved.stdout}\n${moved.stderr}`), behind.value);
  return { kind: "updated", branch, commits: behind.value, merged: ahead.value > 0 };
}

export function syncLine(sync: MainSync): string | undefined {
  switch (sync.kind) {
    case "not-default":
      return undefined;
    case "up-to-date":
      return `Synced: ${sync.branch} already matches origin`;
    case "updated":
      return `Synced: ${sync.branch} ${sync.merged ? "merged with" : "fast-forwarded to"} origin/${sync.branch} (+${commits(sync.commits)})`;
    case "refused":
      return `sync-main: ${sync.reason} — ${sync.branch} left as it was${sync.behind > 0 ? `, ${commits(sync.behind)} behind origin; spec files here may be stale` : ""}`;
  }
}

function mergeCommit(git: Git, tip: string, branch: string): Result<string> {
  const merged = git.run(["merge-tree", "--write-tree", "--name-only", "--no-messages", tip, "HEAD"]);
  const [tree = "", ...conflicted] = merged.stdout.split("\n").filter(Boolean);
  if (merged.code === MERGE_TREE_CONFLICT) return { ok: false, reason: `origin changed the same lines in ${previewPaths(conflicted)}` };
  if (merged.code !== 0) return { ok: false, reason: `git merge-tree failed (needs git ≥ 2.38): ${gitFailureReason(merged.stderr)}` };
  return git.out(["commit-tree", tree, "-p", tip, "-p", "HEAD", "-m", `docs(spec): sync ${branch} with origin`]);
}

function inTheWay(output: string): string {
  const paths = output.split("\n").filter((line) => line.startsWith("\t")).map((line) => line.trim());
  if (paths.length > 0) return `local edits are in the way (${previewPaths(paths)}); commit or stash them, then run sync-main`;
  return `git merge failed: ${gitFailureReason(output) || "unknown error"}`;
}

function commits(n: number): string {
  return `${n} commit${n === 1 ? "" : "s"}`;
}

function count(git: Git, range: string): Result<number> {
  const counted = git.out(["rev-list", "--count", range]);
  return counted.ok ? { ok: true, value: Number(counted.value) } : counted;
}
