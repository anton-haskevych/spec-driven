import type { Git } from "../core/git";
import type { Result } from "../core/result";
import { isSpecDocPath } from "../core/spec-folders";

export interface Pushed {
  branch: string;
  commits: number;
  behind: number;
}

const PREVIEW_PATHS = 3;

export function pathsOutsideSpecDocs(paths: readonly string[]): string[] {
  return [...new Set(paths.filter((path) => path && !isSpecDocPath(path)))];
}

// An explicit refspec: a bare `git push` from a worktree branch created off origin/main pushes to main.
export function pushBranch(git: Git, defaultBranch: string): Result<Pushed> {
  const branch = git.out(["symbolic-ref", "--short", "-q", "HEAD"]);
  if (!branch.ok || !branch.value) return { ok: false, reason: "detached HEAD — check out a branch before pushing" };
  git.run(["fetch", "-q", "origin", defaultBranch]);

  const remoteDefault = `refs/remotes/origin/${defaultBranch}`;
  const remoteBranch = `refs/remotes/origin/${branch.value}`;
  const pushedBefore = git.run(["rev-parse", "--verify", "-q", remoteBranch]).code === 0;
  const unpushed = `${pushedBefore ? remoteBranch : remoteDefault}..HEAD`;
  if (branch.value === defaultBranch) {
    const refusal = codeOnDefaultBranch(git, defaultBranch, unpushed);
    if (refusal) return { ok: false, reason: refusal };
  }

  const commits = countCommits(git, ["--first-parent", unpushed]);
  const upstream = git.out(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  const setUpstream = !upstream.ok || upstream.value !== `origin/${branch.value}`;
  const pushed = git.out(["push", "-q", ...(setUpstream ? ["-u"] : []), "origin", `HEAD:refs/heads/${branch.value}`]);
  if (!pushed.ok) return pushed;
  return { ok: true, value: { branch: branch.value, commits, behind: countCommits(git, [`HEAD..${remoteDefault}`]) } };
}

function codeOnDefaultBranch(git: Git, defaultBranch: string, unpushed: string): string | undefined {
  const log = git.out(["log", "--name-only", "--no-renames", "--format=", unpushed]);
  const outside = pathsOutsideSpecDocs(log.ok ? log.value.split("\n") : []);
  if (outside.length === 0) return undefined;
  const preview = outside.slice(0, PREVIEW_PATHS).join(", ") + (outside.length > PREVIEW_PATHS ? ", …" : "");
  return `${defaultBranch} has unpushed changes outside docs/specs (${preview}) — not pushing code to ${defaultBranch}; ask the user`;
}

function countCommits(git: Git, range: readonly string[]): number {
  const counted = git.out(["rev-list", "--count", ...range]);
  return counted.ok ? Number(counted.value) : 0;
}
