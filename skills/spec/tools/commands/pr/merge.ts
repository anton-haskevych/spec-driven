import { parseArgs } from "node:util";
import { systemRunner } from "../../core/run";
import { MERGE_METHODS, type MergeMethod } from "../../playbook/settings";
import { mergePr, type MergeDeps, type MergeRequest } from "../../pr/actions/merge";

export const PR_MERGE_USAGE = "pr merge [<pr> | <spec-name> [<group>]] [--now] [--method squash|merge|rebase]";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const systemDeps: MergeDeps = { runner: systemRunner, now: () => new Date() };

export async function prMerge(projectDir: string, args: readonly string[], deps: MergeDeps = systemDeps): Promise<string> {
  const request = parseMergeArgs(args);
  return typeof request === "string" ? request : mergePr(projectDir, request, deps);
}

// --date pins the merge line's day for tests.
function parseMergeArgs(args: readonly string[]): MergeRequest | string {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...args],
      options: { now: { type: "boolean" }, method: { type: "string" }, date: { type: "string" } },
      allowPositionals: true,
      strict: true,
    });
  } catch {
    return `usage: ${PR_MERGE_USAGE}`;
  }
  const { values, positionals } = parsed;
  if (positionals.length > 2) return `usage: ${PR_MERGE_USAGE}`;
  if (values.method !== undefined && !isMergeMethod(values.method)) return `pr merge: --method takes ${MERGE_METHODS.slice(0, -1).join(", ")} or ${MERGE_METHODS.at(-1)}`;
  if (values.date !== undefined && !DATE.test(values.date)) return `pr merge: --date ${values.date} is not YYYY-MM-DD`;
  return {
    target: positionals,
    now: values.now ?? false,
    ...(values.method ? { method: values.method } : {}),
    ...(values.date ? { date: values.date } : {}),
  };
}

function isMergeMethod(value: string): value is MergeMethod {
  return MERGE_METHODS.some((method) => method === value);
}
