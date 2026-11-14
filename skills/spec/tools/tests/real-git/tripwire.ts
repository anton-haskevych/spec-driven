import { join } from "node:path";

export const TRIPWIRE_LOG_ENV = "SPEC_GIT_TRIPWIRE_LOG";
export const TRIPWIRE_BIN = join(import.meta.dir, "tripwire");
const FAST_TIER_IGNORES = ["**/*.git.test.ts", "**/fixtures/**"];
const WHAT_TO_DO =
  "A seam is missing or a default runner leaked: pass the deps (tests/stub-runner.ts notARepoRunner, tests/command-deps.ts), or rename the file *.git.test.ts.";

// A CLI --path-ignore-patterns replaces bunfig's list, so fixtures are named again.
export function fastTierArgs(callerArgs: readonly string[]): string[] {
  return ["test", ...FAST_TIER_IGNORES.map((pattern) => `--path-ignore-patterns=${pattern}`), ...callerArgs];
}

export function tripwireReport(log: string): string | undefined {
  const calls = log.split("\n").filter((line) => line.length > 0);
  if (calls.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const call of calls) counts.set(call, (counts.get(call) ?? 0) + 1);
  const lines = [...counts].map(([call, count]) => `  ${count}× ${call}`);
  return [`real git in the fast tier (${calls.length} calls):`, ...lines, WHAT_TO_DO].join("\n");
}
