import { join } from "node:path";
import { gitFailureReason, type Git } from "../core/git";
import { parsePorcelainZ } from "../core/git-status";
import type { Result } from "../core/result";
import { runAll, type AsyncRunner, type RunJob, type RunResult } from "../core/run";
import { isSpecDocPath, locateSpecFile, specRoots } from "../core/spec-folders";
import type { ClassifiedWorkspace } from "./classify";
import type { Workspace } from "./list";

export interface WorkspaceSpecChanges {
  workspace: Workspace;
  specs: Result<string[]>;
}

export const SCAN_CONCURRENCY = 8;

const COMMITTED_SPEC_DOC_PATHSPECS = ["docs/specs", ":(glob)*/docs/specs/**"];

interface Query {
  command: "diff" | "status";
  job: RunJob;
  paths(stdout: string): string[];
}

export async function workspaceSpecChanges(runner: AsyncRunner, live: readonly ClassifiedWorkspace[], baseSha: string): Promise<WorkspaceSpecChanges[]> {
  const queries = live.map((classified) => specDocQueries(classified, baseSha));
  const results = await runAll(runner, queries.flat().map((query) => query.job), SCAN_CONCURRENCY);
  let next = 0;
  return live.map(({ workspace }, index) => {
    const own = queries[index]!.map((query) => ({ query, result: results[next++]! }));
    return { workspace, specs: specNames(workspace.path, own) };
  });
}

// The committed diff only finds something when the worktree has commits that are not on base. The
// uncommitted query names the roots on disk: a glob pathspec makes status walk every untracked dir.
function specDocQueries({ workspace, aheadOfBase }: ClassifiedWorkspace, baseSha: string): Query[] {
  const git = (args: string[], pathspecs: string[]): RunJob => ({ argv: ["git", "--no-optional-locks", ...args, "--", ...pathspecs], options: { cwd: workspace.path } });
  const roots = specRoots(workspace.path);
  const uncommitted: Query[] = roots.length === 0 ? [] : [{ command: "status", job: git(["status", "--porcelain", "-z", "--untracked-files=all"], roots), paths: parsePorcelainZ }];
  if (!aheadOfBase) return uncommitted;
  const committed: Query = { command: "diff", job: git(["diff", "--name-only", "-z", `${baseSha}...${workspace.head}`], COMMITTED_SPEC_DOC_PATHSPECS), paths: splitZ };
  return [committed, ...uncommitted];
}

function specNames(root: string, answered: ReadonlyArray<{ query: Query; result: RunResult }>): Result<string[]> {
  const failed = answered.find(({ result }) => result.code !== 0);
  if (failed) return { ok: false, reason: `git ${failed.query.command} failed: ${gitFailureReason(failed.result.stderr) || `exit ${failed.result.code}`}` };
  const paths = answered.flatMap(({ query, result }) => query.paths(result.stdout)).filter(isSpecDocPath);
  const names = paths.flatMap((path) => locateSpecFile(join(root, path))?.spec.name ?? []);
  return { ok: true, value: [...new Set(names)].sort() };
}

function splitZ(output: string): string[] {
  return output.split("\0").filter(Boolean);
}

// What a tree holds that no remote has: commits on no remote ref, and uncommitted paths. `ahead` is left out
// when the repo has no remote at all, since every commit would then count. Status takes no pathspec: a glob
// makes it walk every untracked directory.
export interface TreeWork {
  ahead?: number;
  edited: number;
}

export function treeWork(git: Git): Result<TreeWork> {
  const status = git.run(["--no-optional-locks", "status", "--porcelain", "-z", "--untracked-files=normal"]);
  if (status.code !== 0) return { ok: false, reason: `git status failed: ${gitFailureReason(status.stderr) || `exit ${status.code}`}` };
  const edited = parsePorcelainZ(status.stdout).length;
  const ahead = commitsOnNoRemote(git);
  return { ok: true, value: ahead === undefined ? { edited } : { ahead, edited } };
}

function commitsOnNoRemote(git: Git): number | undefined {
  const remotes = git.out(["remote"]);
  if (!remotes.ok || remotes.value === "") return undefined;
  const counted = git.out(["rev-list", "--count", "HEAD", "--not", "--remotes"]);
  return counted.ok ? Number(counted.value) : undefined;
}
