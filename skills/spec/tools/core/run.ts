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

export interface AsyncRunner {
  run(argv: readonly string[], options?: RunOptions): Promise<RunResult>;
}

export interface RunJob {
  argv: readonly string[];
  options?: RunOptions;
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
      return failedToRun(cause);
    }
  },
};

export const systemAsyncRunner: AsyncRunner = {
  async run(argv, options = {}) {
    try {
      const child = Bun.spawn([...argv], {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdin: options.stdin === undefined ? "ignore" : Buffer.from(options.stdin),
        stdout: "pipe",
        stderr: "pipe",
        timeout: options.timeoutMs,
      });
      const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      return { code, stdout, stderr: child.killed && options.timeoutMs ? `timed out after ${options.timeoutMs} ms` : stderr };
    } catch (cause) {
      return failedToRun(cause);
    }
  },
};

// Never rejects: a job that throws becomes a 127 result, so one bad worktree can't sink a scan.
export async function runAll(runner: AsyncRunner, jobs: readonly RunJob[], concurrency: number): Promise<RunResult[]> {
  const results: RunResult[] = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    for (let index = next++; index < jobs.length; index = next++) {
      const job = jobs[index]!;
      try {
        results[index] = await runner.run(job.argv, job.options);
      } catch (cause) {
        results[index] = failedToRun(cause);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  return results;
}

function failedToRun(cause: unknown): RunResult {
  return { code: COMMAND_NOT_FOUND, stdout: "", stderr: cause instanceof Error ? cause.message : String(cause) };
}

export function defaultBranch(cwd: string, runner: Runner): string | undefined {
  const originHead = runner.run(["git", "symbolic-ref", "--short", "refs/remotes/origin/HEAD"], { cwd });
  if (originHead.code === 0 && originHead.stdout.trim()) return originHead.stdout.trim().replace(/^origin\//, "");

  const github = runner.run(["gh", "repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"], { cwd });
  return github.code === 0 && github.stdout.trim() ? github.stdout.trim() : undefined;
}
