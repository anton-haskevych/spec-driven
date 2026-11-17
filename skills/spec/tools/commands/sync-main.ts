import { gitAt, type Git } from "../core/git";
import { defaultBranch, systemRunner, type Runner } from "../core/run";
import { syncLine, syncMain } from "../publish/sync-main";

export const SYNC_MAIN_USAGE = "sync-main";

export function syncMainReport(projectDir: string, _args: readonly string[], runner: Runner = systemRunner): string {
  const branch = defaultBranch(projectDir, runner);
  if (!branch) return "sync-main: can't tell the default branch (no origin/HEAD, no gh) — nothing synced";
  return syncLine(syncMain(gitAt(projectDir, runner), branch)) ?? "Synced: not on the default branch — nothing to sync here";
}

// push and publish-docs on the default branch sync first: a push origin would turn down for being behind
// never leaves, and a refusal stops the push with the reason above it.
export function syncBeforePush(git: Git, defaultBranch: string, command: string): { lines: string[]; stop: boolean } {
  const sync = syncMain(git, defaultBranch);
  if (sync.kind === "refused") return { lines: [syncLine(sync) ?? "", `${command}: nothing pushed — sync-main refused (above)`], stop: true };
  return { lines: sync.kind === "updated" ? [syncLine(sync) ?? ""] : [], stop: false };
}
