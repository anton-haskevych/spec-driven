import { gitAt } from "../core/git";
import { defaultBranch, systemRunner, type Runner } from "../core/run";
import { pushBranch, pushResult } from "../publish/push";
import { remoteLine } from "../publish/render";
import { syncBeforePush } from "./sync-main";

export const PUSH_USAGE = "push";
export const NO_DEFAULT_BRANCH = "can't tell the default branch (no origin/HEAD, no gh) — nothing pushed";

export function pushReport(projectDir: string, _args: readonly string[], runner: Runner = systemRunner): string {
  const branch = defaultBranch(projectDir, runner);
  if (!branch) return `push: ${NO_DEFAULT_BRANCH}`;
  const git = gitAt(projectDir, runner);
  const synced = syncBeforePush(git, branch, "push");
  if (synced.stop) return synced.lines.join("\n");
  const pushed = pushResult(pushBranch(git, { defaultBranch: branch }));
  return [...synced.lines, pushed.ok ? remoteLine(pushed.value, branch) : `push: ${pushed.reason}`].join("\n");
}
