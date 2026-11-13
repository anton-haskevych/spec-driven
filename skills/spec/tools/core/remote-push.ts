import { gitFailureReason, type Git } from "./git";
import type { RunOptions, RunResult } from "./run";

export type PushOutcome = { kind: "pushed" } | { kind: "refused" } | { kind: "offline"; reason: string };

export const REMOTE_TIMEOUT_MS = 10_000;

// A shared write must never wait on a credential prompt.
export const NETWORK: Omit<RunOptions, "cwd"> = { timeoutMs: REMOTE_TIMEOUT_MS, env: { GIT_TERMINAL_PROMPT: "0" } };

// `expected` "" is a create-only lease. --no-verify: some repos' pre-push hooks run the test suite.
export function leasePush(git: Git, ref: string, expected: string, refspec: string): PushOutcome {
  return pushOutcome(leasePushRun(git, ref, expected, refspec), ref);
}

export function leasePushRun(git: Git, ref: string, expected: string, refspec: string): RunResult {
  return git.run(["push", "--porcelain", "--no-verify", `--force-with-lease=${ref}:${expected}`, "origin", refspec], NETWORK);
}

// `git push --porcelain` prints one `<flag>\t<from>:<to>\t<summary>` line per ref it got an answer for;
// `!` is a refusal, whether from the client's lease check or the server's old-value check.
export function pushOutcome(result: RunResult, ref: string): PushOutcome {
  const line = refLine(result, ref);
  if (!line) return { kind: "offline", reason: gitFailureReason(result.stderr) || `exit ${result.code}` };
  return line.startsWith("!") ? { kind: "refused" } : { kind: "pushed" };
}

// Lost races read as refused and are tried again; a server rule or hook that turns the push down would only
// say the same thing five times.
const LOST_RACE = /^\[rejected\]|\((failed to update ref|incorrect old value provided)\)/;
const REMOTE_REJECTED = /^\[remote rejected\] \((.+)\)$/;

export function pushDeclined(result: RunResult, ref: string): string | undefined {
  const line = refLine(result, ref);
  if (!line?.startsWith("!")) return undefined;
  const summary = line.split("\t")[2]?.trim() ?? "";
  if (LOST_RACE.test(summary)) return undefined;
  return REMOTE_REJECTED.exec(summary)?.[1];
}

function refLine(result: RunResult, ref: string): string | undefined {
  return result.stdout.split("\n").find((candidate) => candidate.split("\t")[1]?.endsWith(`:${ref}`));
}
