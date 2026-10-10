import { parseArgs } from "node:util";
import { gitAt, stateDir } from "../../core/git";
import type { Result } from "../../core/result";
import { systemRunner, type Runner } from "../../core/run";
import { appendEvent, readEvents, renderTimeline } from "../../pr/babysit/log";
import { ghClient } from "../../pr/gh";
import { parsePrNumber, resolvePr } from "../../pr/resolve";

export const PR_LOG_USAGE = 'pr log [<pr> | <spec-name> [<group>]] [--add "<text>"]';

export function prLog(
  projectDir: string,
  args: readonly string[],
  runner: Runner = systemRunner,
  now = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  const parsed = parseLogArgs(args);
  if (typeof parsed === "string") return parsed;
  const pr = prNumber(projectDir, parsed.target, runner);
  if (!pr.ok) return `pr log: ${pr.reason}`;
  const dir = stateDir(gitAt(projectDir, runner), "babysit");
  if (!dir.ok) return `pr log: ${dir.reason}`;
  if (parsed.note === undefined) return renderTimeline(pr.value, readEvents(dir.value, pr.value), timeZone);
  appendEvent(dir.value, pr.value, { at: now.toISOString(), event: "note", detail: parsed.note });
  return `PR #${pr.value}: note added`;
}

function parseLogArgs(args: readonly string[]): { target: string[]; note?: string } | string {
  try {
    const { values, positionals } = parseArgs({ args: [...args], options: { add: { type: "string" } }, allowPositionals: true, strict: true });
    if (positionals.length > 2) return `usage: ${PR_LOG_USAGE}`;
    const note = values.add?.trim();
    if (values.add !== undefined && !note) return "pr log: --add needs the note's text";
    return { target: positionals, ...(note ? { note } : {}) };
  } catch {
    return `usage: ${PR_LOG_USAGE}`;
  }
}

function prNumber(projectDir: string, target: readonly string[], runner: Runner): Result<number> {
  const number = target.length === 1 ? parsePrNumber(target[0]!) : undefined;
  if (number !== undefined) return { ok: true, value: number };
  const resolved = resolvePr(ghClient(projectDir, runner), projectDir, target);
  return resolved.ok ? { ok: true, value: resolved.value.view.number } : resolved;
}
