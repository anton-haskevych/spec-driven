import type { Result } from "./result";
import type { RunOptions, RunResult, Runner } from "./run";

export interface Git {
  run(args: readonly string[], options?: Omit<RunOptions, "cwd">): RunResult;
  out(args: readonly string[], options?: Omit<RunOptions, "cwd">): Result<string>;
}

export function gitAt(cwd: string, runner: Runner): Git {
  const run = (args: readonly string[], options: Omit<RunOptions, "cwd"> = {}) => runner.run(["git", ...args], { ...options, cwd });
  return {
    run,
    out(args, options) {
      const result = run(args, options);
      if (result.code === 0) return { ok: true, value: result.stdout.trim() };
      return { ok: false, reason: `git ${args[0]} failed: ${gitFailureReason(result.stderr) || `exit ${result.code}`}` };
    },
  };
}

export function firstLine(text: string): string {
  return text.trim().split("\n")[0] ?? "";
}

const REJECTED_REF = /^!\s/;
const ERROR_LINE = /^(fatal|error):/;

// Git often leads with context ("To <remote>", "remote: …") and puts the reason further down.
export function gitFailureReason(stderr: string): string {
  const lines = stderr.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => REJECTED_REF.test(line)) ?? lines.find((line) => ERROR_LINE.test(line)) ?? lines[0] ?? "";
}

export function authorName(git: Git): string | undefined {
  const ident = git.out(["var", "GIT_AUTHOR_IDENT"]);
  return (ident.ok && ident.value.split(" <")[0]?.trim()) || undefined;
}

// Shared by the main checkout and every linked worktree: state kept here is per clone, never committed.
export function gitCommonDir(git: Git): Result<string> {
  return git.out(["rev-parse", "--path-format=absolute", "--git-common-dir"]);
}
