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
      return { ok: false, reason: `git ${args[0]} failed: ${firstLine(result.stderr) || `exit ${result.code}`}` };
    },
  };
}

export function firstLine(text: string): string {
  return text.trim().split("\n")[0] ?? "";
}
