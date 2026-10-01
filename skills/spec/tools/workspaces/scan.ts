import type { Git } from "../core/git";
import type { Result } from "../core/result";
import { runAll, type AsyncRunner } from "../core/run";
import { classifyWorkspaces, parseAheadBehind, suspectNoMergeBase, type ClassifiedWorkspace } from "./classify";
import { SCAN_CONCURRENCY, workspaceSpecChanges } from "./changes";
import { loadWorkspaces, type Workspace } from "./list";

export interface WorkspaceScan {
  workspace: Workspace;
  specs: string[];
}

export interface WorkspaceScanResult {
  scans: WorkspaceScan[];
  counts: { merged: number; unknownBase: number; unreadable: number };
}

const NO_MERGE_BASE_EXIT = 1;

// list → ahead-behind → classify → spec-doc changes of the live ones. A worktree whose diff fails is
// unknown-base when it shares no history with base (shallow clones), unreadable otherwise.
export async function scanWorkspaces(git: Git, runner: AsyncRunner, baseSha: string, forceLive: ReadonlySet<string>): Promise<Result<WorkspaceScanResult>> {
  const workspaces = loadWorkspaces(git);
  if (!workspaces.ok) return workspaces;
  const refs = git.run(["--no-optional-locks", "for-each-ref", `--format=%(refname:short) %(ahead-behind:${baseSha})`, "refs/heads"]);
  if (refs.code !== 0) return { ok: false, reason: `git for-each-ref failed: ${refs.stderr.trim() || `exit ${refs.code}`}` };

  const aheadBehind = parseAheadBehind(refs.stdout);
  const noMergeBase = await withoutMergeBase(runner, baseSha, suspectNoMergeBase(workspaces.value, aheadBehind));
  const unmergedDetached = unmergedDetachedHeads(git, baseSha, workspaces.value);
  const classified = classifyWorkspaces(workspaces.value, { aheadBehind, unmergedDetached, noMergeBase, forceLive });

  const changes = await workspaceSpecChanges(runner, classified.filter(({ kind }) => kind === "live"), baseSha);
  const failed = changes.filter(({ specs }) => !specs.ok).map(({ workspace }) => workspace);
  const failedWithoutBase = await withoutMergeBase(runner, baseSha, failed);
  return {
    ok: true,
    value: {
      scans: changes.flatMap(({ workspace, specs }) => (specs.ok ? [{ workspace, specs: specs.value }] : [])),
      counts: {
        merged: count(classified, "merged"),
        unknownBase: count(classified, "unknown-base") + failedWithoutBase.size,
        unreadable: count(classified, "unreadable") + failed.length - failedWithoutBase.size,
      },
    },
  };
}

async function withoutMergeBase(runner: AsyncRunner, baseSha: string, workspaces: readonly Workspace[]): Promise<Set<string>> {
  const jobs = workspaces.map((workspace) => ({ argv: ["git", "merge-base", baseSha, workspace.head], options: { cwd: workspace.path } }));
  const results = await runAll(runner, jobs, SCAN_CONCURRENCY);
  return new Set(workspaces.filter((_, index) => results[index]?.code === NO_MERGE_BASE_EXIT).map((workspace) => workspace.path));
}

// If rev-list itself fails, every detached head counts as unmerged: scanning one too many beats
// silently counting unmerged work as merged.
function unmergedDetachedHeads(git: Git, baseSha: string, workspaces: readonly Workspace[]): Set<string> {
  const heads = [...new Set(workspaces.filter((workspace) => workspace.detached && !workspace.prunable).map((workspace) => workspace.head))];
  if (heads.length === 0) return new Set();
  const listed = git.run(["rev-list", "--no-walk", ...heads, `^${baseSha}`]);
  return listed.code === 0 ? new Set(listed.stdout.split("\n").filter(Boolean)) : new Set(heads);
}

function count(classified: readonly ClassifiedWorkspace[], kind: ClassifiedWorkspace["kind"]): number {
  return classified.filter((entry) => entry.kind === kind).length;
}
