import { isRecord } from "../core/frontmatter";
import { gitAt } from "../core/git";
import { systemRunner, type Runner } from "../core/run";
import { findProjectDir } from "../core/spec-folders";
import { planShapeOf } from "../plan/plan-diff";
import { noticePlanChange, sessionPlanMemory, type FetchTry, type PlanMemory } from "../plan/plan-version";
import { readPlans } from "../plan/read-plans";
import type { JoinedPlan } from "../plan/state-source";
import { loadSettings } from "../playbook/settings";

export interface PlansNow {
  ok: boolean;
  joined(spec: string): JoinedPlan | undefined;
}

export type HookRead = (projectDir: string) => PlansNow;

const WATCHED_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);
const CHECK_EVERY_MS = 120_000;
// Offline, each try would wait out the fetch limit again: back off instead.
const AFTER_FAILURE_MS = 10 * 60_000;
const FETCH_LIMIT_MS = 3_000;

// Only specs this session was already shown: a session that never loaded a joined spec pays nothing.
export function planChangedResponse(payload: unknown, fallbackDir: string, memory: PlanMemory, now: Date, read: HookRead): string | undefined {
  if (!isRecord(payload) || !WATCHED_TOOLS.has(String(payload.tool_name))) return undefined;
  const specs = memory.specs();
  if (specs.length === 0 || !dueForCheck(memory.lastFetch(), now)) return undefined;

  memory.triedFetch(now, false);
  const plans = read(findProjectDir(typeof payload.cwd === "string" ? payload.cwd : fallbackDir));
  if (plans.ok) memory.triedFetch(now, true);

  const lines = specs.flatMap((spec) => {
    const joined = plans.joined(spec);
    const line = joined ? noticePlanChange(memory, spec, planShapeOf(joined)) : undefined;
    return line ? [`${spec}: ${line}`] : [];
  });
  if (lines.length === 0) return undefined;
  return JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: lines.join("\n") } });
}

export function dueForCheck(last: FetchTry | undefined, now: Date): boolean {
  if (!last) return true;
  return now.getTime() - last.at.getTime() >= (last.ok ? CHECK_EVERY_MS : AFTER_FAILURE_MS);
}

// Fetches only while the board is on, as every reader does; off, it reads what the last fetch left.
export function readPlansForHook(projectDir: string, runner: Runner, now: Date): PlansNow {
  const plans = readPlans(gitAt(projectDir, runner), { fetch: loadSettings(projectDir).board.record, now, fetchTimeoutMs: FETCH_LIMIT_MS });
  return { ok: !(plans.record.kind === "read" && plans.record.offline), joined: plans.joined };
}

if (import.meta.main) {
  try {
    const raw = await Bun.stdin.text();
    const payload: unknown = raw.trim() ? JSON.parse(raw) : undefined;
    const sessionId = isRecord(payload) && typeof payload.session_id === "string" ? payload.session_id : undefined;
    const now = new Date();
    const response = sessionId ? planChangedResponse(payload, process.cwd(), sessionPlanMemory(sessionId), now, (dir) => readPlansForHook(dir, systemRunner, now)) : undefined;
    if (response) console.log(response);
  } catch {
    // Fail open: a plan notice is a hint, never a reason to stop an edit.
  }
  process.exit(0);
}
