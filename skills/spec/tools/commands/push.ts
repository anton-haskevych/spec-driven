import { gitAt } from "../core/git";
import { defaultBranch, systemRunner, type Runner } from "../core/run";
import { pushBranch } from "../publish/push";
import { remoteLine } from "../publish/render";

export const PUSH_USAGE = "push";
export const NO_DEFAULT_BRANCH = "can't tell the default branch (no origin/HEAD, no gh) — nothing pushed";

export function pushReport(projectDir: string, _args: readonly string[], runner: Runner = systemRunner): string {
  const branch = defaultBranch(projectDir, runner);
  if (!branch) return `push: ${NO_DEFAULT_BRANCH}`;
  const pushed = pushBranch(gitAt(projectDir, runner), branch);
  return pushed.ok ? remoteLine(pushed.value, branch) : `push: ${pushed.reason}`;
}
