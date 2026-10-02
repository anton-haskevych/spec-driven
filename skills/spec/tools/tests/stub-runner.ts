import type { AsyncRunner, RunResult, Runner } from "../core/run";

export type CannedRuns = ReadonlyArray<readonly [argvPrefix: readonly string[], result: Partial<RunResult>]>;

const FAILED: RunResult = { code: 1, stdout: "", stderr: "no canned result" };

export function stubRunner(canned: CannedRuns): Runner & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    run(argv) {
      calls.push([...argv]);
      const match = canned.find(([prefix]) => prefix.every((part, index) => argv[index] === part));
      return match ? { code: 0, stdout: "", stderr: "", ...match[1] } : FAILED;
    },
  };
}

export interface AsyncCall {
  argv: string[];
  cwd?: string;
}

export function asyncStubRunner(canned: CannedRuns): AsyncRunner & { calls: AsyncCall[] } {
  const sync = stubRunner(canned);
  const calls: AsyncCall[] = [];
  return {
    calls,
    async run(argv, options = {}) {
      calls.push(options.cwd === undefined ? { argv: [...argv] } : { argv: [...argv], cwd: options.cwd });
      return sync.run(argv, options);
    },
  };
}

// Real processes for everything but gh, which answers from `canned`, so board tests never reach GitHub.
export function cannedGh(runner: AsyncRunner, canned: CannedRuns): AsyncRunner {
  const gh = asyncStubRunner(canned);
  return { run: (argv, options) => (argv[0] === "gh" ? gh.run(argv, options) : runner.run(argv, options)) };
}
