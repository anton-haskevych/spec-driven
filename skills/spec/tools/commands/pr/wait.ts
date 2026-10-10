import { parseArgs } from "node:util";
import { systemRunner } from "../../core/run";
import { systemClock } from "../../pr/babysit/poll";
import { waitForPr, type WaitDeps, type WaitRequest } from "../../pr/babysit/wait";

export const PR_WAIT_USAGE = "pr wait [<pr> | <spec-name> [<group>]] [--sha <sha>] [--since <iso>] [--timeout 25m] [--interval 30s]";

const DEFAULT_TIMEOUT = "25m";
const DEFAULT_INTERVAL = "30s";
const DURATION = /^(\d+)(s|m|h)$/;
const UNIT_MS: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000 };

const systemDeps: WaitDeps = { runner: systemRunner, clock: systemClock };

export function prWait(projectDir: string, args: readonly string[], deps: WaitDeps = systemDeps): Promise<string> | string {
  const request = parseWaitArgs(args);
  return typeof request === "string" ? request : waitForPr(projectDir, request, deps);
}

function parseWaitArgs(args: readonly string[]): WaitRequest | string {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...args],
      options: { sha: { type: "string" }, since: { type: "string" }, timeout: { type: "string" }, interval: { type: "string" } },
      allowPositionals: true,
      strict: true,
    });
  } catch {
    return `usage: ${PR_WAIT_USAGE}`;
  }
  const { values, positionals } = parsed;
  if (positionals.length > 2) return `usage: ${PR_WAIT_USAGE}`;
  const timeoutMs = durationMs(values.timeout ?? DEFAULT_TIMEOUT);
  const intervalMs = durationMs(values.interval ?? DEFAULT_INTERVAL);
  if (timeoutMs === undefined || intervalMs === undefined || intervalMs === 0) return "pr wait: --timeout and --interval take a duration like 25m, 30s or 1h";
  if (values.since !== undefined && Number.isNaN(Date.parse(values.since))) return `pr wait: --since ${values.since} is not a date`;
  return {
    target: positionals,
    timeoutMs,
    intervalMs,
    ...(values.sha ? { sha: values.sha } : {}),
    ...(values.since ? { since: values.since } : {}),
  };
}

function durationMs(text: string): number | undefined {
  const match = DURATION.exec(text);
  return match ? Number(match[1]) * UNIT_MS[match[2]!]! : undefined;
}
