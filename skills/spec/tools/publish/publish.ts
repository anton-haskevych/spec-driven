import { gitFailureReason, type Git } from "../core/git";
import type { Result } from "../core/result";
import type { RunResult } from "../core/run";
import { buildSnapshot, pinDefault } from "./snapshot";

export interface PublishRequest {
  defaultBranch: string;
  spec?: string;
}

export type Published =
  | { kind: "published"; sha: string; main: string; snapshot: string; files: string[]; deleted: string[]; mergeBack: Result<void> }
  | { kind: "nothing"; main: string; deleted: string[] };

type Attempt = Result<Published> | { retry: true };

const MERGE_TREE_CONFLICT = 1;
export const NON_FAST_FORWARD = /\[rejected\].*\((non-fast-forward|fetch first)\)/;

export function mergeTreeOutcome(result: RunResult): Result<string> {
  const [tree = "", ...conflicted] = result.stdout.split("\n").filter(Boolean);
  if (result.code === 0) return { ok: true, value: tree };
  if (result.code === MERGE_TREE_CONFLICT) {
    return { ok: false, reason: `diverged on main in ${conflicted.join(", ")} — merge main first; nothing pushed` };
  }
  return { ok: false, reason: `git merge-tree failed (needs git ≥ 2.38): ${gitFailureReason(result.stderr)}` };
}

export function publishDocs(git: Git, request: PublishRequest): Result<Published> {
  const first = publishAttempt(git, request);
  if (!("retry" in first)) return first;
  const second = publishAttempt(git, request);
  if (!("retry" in second)) return second;
  return { ok: false, reason: "main moved twice while publishing; nothing pushed — run publish-docs again" };
}

function publishAttempt(git: Git, request: PublishRequest): Attempt {
  const main = pinDefault(git, request.defaultBranch);
  if (!main.ok) return main;
  const snapshot = buildSnapshot(git, { main: main.value, ...(request.spec ? { spec: request.spec } : {}) });
  if (!snapshot.ok) return snapshot;
  if (snapshot.value.kind === "nothing") return { ok: true, value: { kind: "nothing", main: main.value, deleted: snapshot.value.deleted } };

  const { commit, files, deleted } = snapshot.value;
  const tree = mergeTreeOutcome(git.run(["merge-tree", "--write-tree", "--name-only", "--no-messages", main.value, commit]));
  if (!tree.ok) return tree;
  const label = request.spec ? ` ${request.spec}` : "";
  const merged = git.out(["commit-tree", tree.value, "-p", main.value, "-p", commit, "-m", `docs(spec): publish${label}`]);
  if (!merged.ok) return merged;

  const pushed = git.run(["push", "-q", "origin", `${merged.value}:refs/heads/${request.defaultBranch}`]);
  if (pushed.code !== 0 && NON_FAST_FORWARD.test(pushed.stderr)) return { retry: true };
  if (pushed.code !== 0) return { ok: false, reason: `push to ${request.defaultBranch} rejected: ${pushed.stderr.trim()}` };

  const mergeBack = mergeSnapshotBack(git, commit);
  return { ok: true, value: { kind: "published", sha: merged.value, main: main.value, snapshot: commit, files, deleted, mergeBack } };
}

function mergeSnapshotBack(git: Git, snapshot: string): Result<void> {
  const merged = git.out(["merge", "-q", "--no-edit", snapshot]);
  return merged.ok ? { ok: true, value: undefined } : { ok: false, reason: `${merged.reason}; run git merge --no-edit ${snapshot}` };
}
