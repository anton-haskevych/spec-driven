import type { Runner } from "../core/run";

// One tree only: across every tree this stats every file (project ledger). --no-optional-locks keeps status
// from rewriting the index under the session working there; untracked dirs are listed, not walked.
export function hasUncommittedChanges(tree: string, runner: Runner): boolean {
  const status = runner.run(["git", "--no-optional-locks", "status", "--porcelain", "-z", "--untracked-files=normal"], { cwd: tree });
  return status.code !== 0 || status.stdout.length > 0;
}
