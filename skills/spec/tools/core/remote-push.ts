import { gitFailureReason, type Git } from "./git";
import type { RunOptions, RunResult } from "./run";

export type PushOutcome = { kind: "pushed" } | { kind: "refused" } | { kind: "offline"; reason: string };

export const REMOTE_TIMEOUT_MS = 10_000;

// A shared write must never wait on a credential prompt.
export const NETWORK: Omit<RunOptions, "cwd"> = { timeoutMs: REMOTE_TIMEOUT_MS, env: { GIT_TERMINAL_PROMPT: "0" } };

// `expected` "" is a create-only lease. --no-verify: some repos' pre-push hooks run the test suite.
export function leasePush(git: Git, ref: string, expected: string, refspec: string): PushOutcome {
  const result = git.run(["push", "--porcelain", "--no-verify", `--force-with-lease=${ref}:${expected}`, "origin", refspec], NETWORK);
  return pushOutcome(result, ref);
}

// `git push --porcelain` prints one `<flag>\t<from>:<to>\t<summary>` line per ref it got an answer for;
// `!` is a refusal, whether from the client's lease check or the server's old-value check.
export function pushOutcome(result: RunResult, ref: string): PushOutcome {
  const line = result.stdout.split("\n").find((candidate) => candidate.split("\t")[1]?.endsWith(`:${ref}`));
  if (!line) return { kind: "offline", reason: gitFailureReason(result.stderr) || `exit ${result.code}` };
  return line.startsWith("!") ? { kind: "refused" } : { kind: "pushed" };
}
