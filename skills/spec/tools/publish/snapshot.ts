import { gitFailureReason, type Git } from "../core/git";
import type { Result } from "../core/result";
import { isSpecDocPath } from "../core/spec-folders";
import { commitOnto } from "./commit-onto";

export const SNAPSHOT_SUBJECT = "docs(spec): snapshot";

export interface SpecDocChanges {
  publish: string[];
  deleted: string[];
}

export type Snapshot =
  | { kind: "built"; commit: string; base: string; files: string[]; deleted: string[] }
  | { kind: "nothing"; deleted: string[] };

export interface SnapshotRequest {
  main: string;
  spec?: string;
}

export function pinDefault(git: Git, branch: string, options: { timeoutMs?: number } = {}): Result<string> {
  const fetched = git.out(["fetch", "-q", "origin", branch], options);
  if (!fetched.ok) return fetched;
  return originTip(git, branch);
}

export function originTip(git: Git, branch: string): Result<string> {
  return git.out(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${branch}^{commit}`]);
}

export function specDocChanges(nameStatusZ: string): SpecDocChanges {
  const fields = nameStatusZ.split("\0");
  const changes: SpecDocChanges = { publish: [], deleted: [] };
  for (let index = 0; index + 1 < fields.length; index += 2) {
    const [status, path] = [fields[index], fields[index + 1] ?? ""];
    if (!isSpecDocPath(path)) continue;
    if (status === "A" || status === "M") changes.publish.push(path);
    if (status === "D") changes.deleted.push(path);
  }
  return changes;
}

export function buildSnapshot(git: Git, request: SnapshotRequest): Result<Snapshot> {
  const base = snapshotBase(git, request.main);
  if (!base.ok) return base;
  const diff = git.run(["diff", "--name-status", "--no-renames", "-z", base.value, "HEAD"]);
  if (diff.code !== 0) return { ok: false, reason: `git diff failed: ${gitFailureReason(diff.stderr)}` };

  const { publish, deleted } = specDocChanges(diff.stdout);
  if (publish.length === 0) return { ok: true, value: { kind: "nothing", deleted } };
  const commit = snapshotCommit(git, base.value, publish, request.spec);
  return commit.ok ? { ok: true, value: { kind: "built", commit: commit.value, base: base.value, files: publish, deleted } } : commit;
}

function snapshotBase(git: Git, main: string): Result<string> {
  const mergeBase = git.out(["merge-base", "HEAD", main]);
  if (!mergeBase.ok) return mergeBase;
  const last = git.out(["log", "-1", "--format=%H", `--grep=^${SNAPSHOT_SUBJECT}`, "HEAD"]);
  if (!last.ok || !last.value) return mergeBase;
  const alreadyOnMain = git.run(["merge-base", "--is-ancestor", last.value, mergeBase.value]).code === 0;
  return alreadyOnMain ? mergeBase : last;
}

function snapshotCommit(git: Git, base: string, files: readonly string[], spec: string | undefined): Result<string> {
  const entries = git.run(["ls-tree", "-z", "HEAD", "--", ...files]);
  if (entries.code !== 0) return { ok: false, reason: `git ls-tree failed: ${gitFailureReason(entries.stderr)}` };
  return commitOnto(git, base, entries.stdout, spec ? `${SNAPSHOT_SUBJECT} ${spec}` : SNAPSHOT_SUBJECT);
}
