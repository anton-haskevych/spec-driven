import { basename } from "node:path";
import { gitFailureReason, type Git } from "../core/git";
import { parsePorcelainZ } from "../core/git-status";
import type { Result } from "../core/result";
import { runAll, type AsyncRunner, type RunJob } from "../core/run";
import { SCAN_CONCURRENCY } from "../workspaces/changes";
import { loadWorkspaces } from "../workspaces/list";
import { scanWorkspaces } from "../workspaces/scan";

export type TidyHolders = ReadonlyMap<string, readonly string[]>;

interface Query {
  job: RunJob;
  paths(stdout: string): string[];
}

interface Holder {
  name: string;
  paths: string[];
}

// Tidy may rewrite a file only when no worktree here and no remote branch of the spec (`feat/<spec>*`,
// where the other machine's work is) changed it: a rewritten file would hand that work a conflict.
export async function tidyHolders(git: Git, asyncRunner: AsyncRunner, baseSha: string, spec: string, specDir: string): Promise<Result<TidyHolders>> {
  const trees = await treeHolders(git, asyncRunner, baseSha, spec, specDir);
  if (!trees.ok) return trees;
  const branches = branchHolders(git, baseSha, spec, specDir);
  if (!branches.ok) return branches;
  const byPath = new Map<string, string[]>();
  for (const { name, paths } of [...trees.value, ...branches.value]) {
    for (const path of paths) byPath.set(path, [...new Set([...(byPath.get(path) ?? []), name])]);
  }
  return { ok: true, value: byPath };
}

async function treeHolders(git: Git, asyncRunner: AsyncRunner, baseSha: string, spec: string, specDir: string): Promise<Result<Holder[]>> {
  const workspaces = loadWorkspaces(git);
  if (!workspaces.ok) return { ok: false, reason: `can't list the worktrees: ${workspaces.reason}` };
  // A tree with no commits off base still holds its uncommitted edits.
  const scanned = await scanWorkspaces(git, asyncRunner, baseSha, new Set(workspaces.value.map((workspace) => workspace.path)));
  if (!scanned.ok) return { ok: false, reason: `can't read the worktrees: ${scanned.reason}` };
  const { unreadable, unknownBase } = scanned.value.counts;
  if (unreadable + unknownBase > 0) return { ok: false, reason: `${unreadable + unknownBase} worktrees couldn't be read, so their changes are unknown` };
  const trees = scanned.value.scans.filter(({ specs }) => specs.includes(spec)).map(({ workspace }) => workspace);
  const queries = trees.map((tree) => treeQueries(tree.path, baseSha, specDir));
  const results = await runAll(asyncRunner, queries.flat().map((query) => query.job), SCAN_CONCURRENCY);
  const failed = results.find((result) => result.code !== 0);
  if (failed) return { ok: false, reason: `git couldn't list a worktree's changes: ${gitFailureReason(failed.stderr) || `exit ${failed.code}`}` };
  let next = 0;
  return { ok: true, value: trees.map((tree, index) => ({ name: `tree ${basename(tree.path)}`, paths: queries[index]!.flatMap((query) => query.paths(results[next++]?.stdout ?? "")) })) };
}

function treeQueries(treeDir: string, baseSha: string, specDir: string): Query[] {
  const job = (args: string[]): RunJob => ({ argv: ["git", "--no-optional-locks", ...args, "--", specDir], options: { cwd: treeDir } });
  return [
    { job: job(["diff", "--name-only", "-z", `${baseSha}...HEAD`]), paths: splitZ },
    { job: job(["status", "--porcelain", "-z", "--untracked-files=all"]), paths: parsePorcelainZ },
  ];
}

function branchHolders(git: Git, baseSha: string, spec: string, specDir: string): Result<Holder[]> {
  const pattern = `refs/remotes/origin/feat/${spec}*`;
  const fetched = git.run(["fetch", "-q", "--prune", "origin", `+refs/heads/feat/${spec}*:${pattern}`]);
  if (fetched.code !== 0) return { ok: false, reason: `can't fetch the spec's branches: ${gitFailureReason(fetched.stderr)}` };
  const listed = git.out(["for-each-ref", "--format=%(refname:short)", pattern]);
  if (!listed.ok) return listed;
  const holders: Holder[] = [];
  for (const branch of listed.value.split("\n").filter(Boolean)) {
    const changed = git.out(["diff", "--name-only", "-z", `${baseSha}...${branch}`, "--", specDir]);
    if (!changed.ok) return { ok: false, reason: `can't diff ${branch}: ${changed.reason}` };
    holders.push({ name: `branch ${branch}`, paths: splitZ(changed.value) });
  }
  return { ok: true, value: holders };
}

function splitZ(stdout: string): string[] {
  return stdout.split("\0").filter(Boolean);
}
