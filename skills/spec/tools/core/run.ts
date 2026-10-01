export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdin?: string;
  timeoutMs?: number;
}

export interface Runner {
  run(argv: readonly string[], options?: RunOptions): RunResult;
}

const COMMAND_NOT_FOUND = 127;

export const systemRunner: Runner = {
  run(argv, options = {}) {
    try {
      const result = Bun.spawnSync([...argv], {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdin: options.stdin === undefined ? "ignore" : Buffer.from(options.stdin),
        timeout: options.timeoutMs,
      });
      const stderr = result.exitedDueToTimeout ? `timed out after ${options.timeoutMs} ms` : result.stderr.toString();
      return { code: result.exitCode ?? 1, stdout: result.stdout.toString(), stderr };
    } catch (cause) {
      return { code: COMMAND_NOT_FOUND, stdout: "", stderr: cause instanceof Error ? cause.message : String(cause) };
    }
  },
};

export function defaultBranch(cwd: string, runner: Runner): string | undefined {
  const originHead = runner.run(["git", "symbolic-ref", "--short", "refs/remotes/origin/HEAD"], { cwd });
  if (originHead.code === 0 && originHead.stdout.trim()) return originHead.stdout.trim().replace(/^origin\//, "");

  const github = runner.run(["gh", "repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"], { cwd });
  return github.code === 0 && github.stdout.trim() ? github.stdout.trim() : undefined;
}
