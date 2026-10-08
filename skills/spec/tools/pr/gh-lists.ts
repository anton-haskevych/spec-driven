import type { Result } from "../core/result";
import type { AsyncRunner, RunResult } from "../core/run";
import { parseJson } from "./gh-records";

export const GH_TIMEOUT_MS = 10_000;
const PR_LIST_LIMIT = "100";
const OPEN_FIELDS = "number,headRefName,isDraft,url,statusCheckRollup,author";
const RECENT_FIELDS = "number,headRefName,state,mergedAt,url";

export interface PrLists {
  open: unknown[];
  recent: unknown[];
}

// Two lists, not one: `--state all` with the rollup takes 8 s, and it doesn't put open PRs first.
export async function fetchPrLists(cwd: string, runner: AsyncRunner, timeoutMs = GH_TIMEOUT_MS): Promise<Result<PrLists>> {
  const list = (state: string, fields: string) =>
    runner.run(["gh", "pr", "list", "--state", state, "--limit", PR_LIST_LIMIT, "--json", fields], { cwd, timeoutMs }).then(toArray);
  const [open, recent] = await Promise.all([list("open", OPEN_FIELDS), list("all", RECENT_FIELDS)]);
  if (!open.ok) return open;
  if (!recent.ok) return recent;
  return { ok: true, value: { open: open.value, recent: recent.value } };
}

function toArray(result: RunResult): Result<unknown[]> {
  const value = result.code === 0 ? parseJson(result.stdout) : undefined;
  if (Array.isArray(value)) return { ok: true, value };
  const reason = result.stderr.trim().split("\n")[0];
  return reason ? { ok: false, reason } : noOutput();
}

function noOutput(): { ok: false; reason: string } {
  return { ok: false, reason: "gh pr list gave no usable output" };
}
