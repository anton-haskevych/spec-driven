import type { Git } from "../core/git";
import { gitFailureReason } from "../core/git";
import { NETWORK, pushOutcome } from "../core/remote-push";

export type CommitPush = { kind: "pushed" } | { kind: "offline"; reason: string } | { kind: "gone"; reason: string };

// Sends one commit a session made offline. A rejection is fine when the branch already holds the commit
// (a later push carried it); otherwise the branch moved on without it.
export function pushCommit(git: Git, sha: string, branch: string): CommitPush {
  const ref = `refs/heads/${branch}`;
  const result = git.run(["push", "--porcelain", "--no-verify", "origin", `${sha}:${ref}`], NETWORK);
  if (result.code === 0) return { kind: "pushed" };
  if (pushOutcome(result, ref).kind === "offline") return { kind: "offline", reason: gitFailureReason(result.stderr) || `exit ${result.code}` };
  const fetched = git.run(["fetch", "-q", "--no-tags", "origin", ref], NETWORK);
  if (fetched.code !== 0) return { kind: "offline", reason: gitFailureReason(fetched.stderr) || `exit ${fetched.code}` };
  const contained = git.run(["merge-base", "--is-ancestor", sha, "FETCH_HEAD"]).code === 0;
  return contained ? { kind: "pushed" } : { kind: "gone", reason: `${sha.slice(0, 7)} is no longer on ${branch}` };
}
