import { parseArgs } from "node:util";
import { durationMs } from "../../core/duration";
import type { Result } from "../../core/result";
import { systemRunner, type Runner } from "../../core/run";
import { rosterChange, rosterSnapshot, type RosterSnapshot } from "../../crew/roster";
import { pollUntil, systemClock, type PollClock } from "../../pr/babysit/poll";
import { loadAgents } from "../../sessions/agents";

export const CREW_WAIT_USAGE = "crew wait <id…> [--timeout 30m] [--interval 20s]";

export interface CrewWaitDeps {
  runner: Runner;
  clock: PollClock;
}

interface WaitRequest {
  ids: string[];
  timeoutMs: number;
  intervalMs: number;
}

const SESSION_ID = /^[0-9a-z-]+$/i;

// Ids come as argv: the Bash tool's zsh doesn't split `$ids`, which once read every worker as gone.
export async function crewWait(_projectDir: string, args: readonly string[], deps: CrewWaitDeps = { runner: systemRunner, clock: systemClock }): Promise<string> {
  const request = parseWaitArgs(args);
  if (!request.ok) return request.reason;
  const { ids, timeoutMs, intervalMs } = request.value;
  let before: RosterSnapshot | undefined;
  const poll = () => {
    const agents = loadAgents(deps.runner);
    if (!agents.ok) return [];
    const now = rosterSnapshot(agents.value, ids);
    const lines = rosterChange(before, now, ids);
    before = now;
    return lines;
  };
  const polled = await pollUntil(poll, (lines) => lines.length > 0, { intervalMs, timeoutMs, clock: deps.clock });
  return polled.settled ? polled.value.join("\n") : "heartbeat";
}

function parseWaitArgs(args: readonly string[]): Result<WaitRequest> {
  const usage = { ok: false as const, reason: `usage: ${CREW_WAIT_USAGE}` };
  let parsed;
  try {
    parsed = parseArgs({ args: [...args], options: { timeout: { type: "string" }, interval: { type: "string" } }, allowPositionals: true, strict: true });
  } catch {
    return usage;
  }
  const ids = parsed.positionals;
  if (ids.length === 0) return usage;
  const bad = ids.find((id) => !SESSION_ID.test(id));
  if (bad !== undefined) return { ok: false, reason: `crew wait: not a session id: ${bad}` };
  const timeoutMs = durationMs(parsed.values.timeout ?? "30m");
  const intervalMs = durationMs(parsed.values.interval ?? "20s");
  if (timeoutMs === undefined || intervalMs === undefined || intervalMs === 0) return { ok: false, reason: "crew wait: --timeout and --interval take a duration like 30m, 20s or 1h" };
  return { ok: true, value: { ids, timeoutMs, intervalMs } };
}
