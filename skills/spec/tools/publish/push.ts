import type { Git } from "../core/git";
import { gitFailureReason } from "../core/git";
import { parsePorcelainZ } from "../core/git-status";
import { NETWORK, pushOutcome } from "../core/remote-push";
import type { Result } from "../core/result";
import type { RunOptions, RunResult } from "../core/run";
import { isSpecDocPath } from "../core/spec-folders";

export interface Pushed {
  branch: string;
  commits: number;
  behind: number;
}

// `refused`: this tool wouldn't push (detached HEAD, code on the default branch); `rejected`: origin said no.
export type BranchPush =
  | ({ kind: "pushed" } & Pushed)
  | { kind: "offline"; branch: string; reason: string }
  | { kind: "rejected"; branch: string; reason: string }
  | { kind: "refused"; reason: string };

export interface PushOptions {
  network?: Omit<RunOptions, "cwd">;
  verify?: boolean;
}

// A save while working: never waits on a credential prompt or a slow origin, never runs pre-push hooks.
export const SAVE: PushOptions = { network: NETWORK, verify: false };

const PREVIEW_PATHS = 3;
const STOPPED_LOCALLY = /failed to push some refs/;
const FATAL = /^fatal:/m;

export function pathsOutsideSpecDocs(paths: readonly string[]): string[] {
  return [...new Set(paths.filter((path) => path && !isSpecDocPath(path)))];
}

// Code edits a commit doesn't hold yet, tracked or not; spec docs don't count.
export function unsavedCodePaths(git: Git): string[] {
  const status = git.run(["status", "--porcelain", "-z"]);
  return status.code === 0 ? pathsOutsideSpecDocs(parsePorcelainZ(status.stdout)) : [];
}

// An explicit refspec: a bare `git push` from a worktree branch created off origin/main pushes to main.
export function pushBranch(git: Git, defaultBranch: string, options: PushOptions = {}): BranchPush {
  const branch = git.out(["symbolic-ref", "--short", "-q", "HEAD"]);
  if (!branch.ok || !branch.value) return { kind: "refused", reason: "detached HEAD — check out a branch before pushing" };
  git.run(["fetch", "-q", "origin", defaultBranch], options.network);

  const remoteDefault = `refs/remotes/origin/${defaultBranch}`;
  const remoteBranch = `refs/remotes/origin/${branch.value}`;
  const pushedBefore = git.run(["rev-parse", "--verify", "-q", remoteBranch]).code === 0;
  const unpushed = `${pushedBefore ? remoteBranch : remoteDefault}..HEAD`;
  if (branch.value === defaultBranch) {
    const refusal = codeOnDefaultBranch(git, defaultBranch, unpushed);
    if (refusal) return { kind: "refused", reason: refusal };
  }

  const commits = countCommits(git, ["--first-parent", unpushed]);
  const upstream = git.out(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  const setUpstream = !upstream.ok || upstream.value !== `origin/${branch.value}`;
  const flags = [...(setUpstream ? ["-u"] : []), ...(options.verify === false ? ["--no-verify"] : [])];
  const ref = `refs/heads/${branch.value}`;
  const result = git.run(["push", "--porcelain", ...flags, "origin", `HEAD:${ref}`], options.network);
  if (result.code === 0) return { kind: "pushed", branch: branch.value, commits, behind: countCommits(git, [`HEAD..${remoteDefault}`]) };
  const reason = `git push failed: ${gitFailureReason(result.stderr) || `exit ${result.code}`}`;
  return { kind: answeredNo(result, ref) ? "rejected" : "offline", branch: branch.value, reason };
}

// For callers that report any failure the same way (`spec.ts push`, publish-docs, pr open).
export function pushResult(push: BranchPush): Result<Pushed> {
  if (push.kind !== "pushed") return { ok: false, reason: push.reason };
  return { ok: true, value: { branch: push.branch, commits: push.commits, behind: push.behind } };
}

// A ref origin answered for, or a push stopped before it left (a pre-push hook): git says "failed to push"
// with no fatal error. Anything else never reached origin.
function answeredNo(result: RunResult, ref: string): boolean {
  if (pushOutcome(result, ref).kind !== "offline") return true;
  return STOPPED_LOCALLY.test(result.stderr) && !FATAL.test(result.stderr);
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
