import { isRecord, numberField, stringField, type FrontmatterData } from "../core/frontmatter";
import type { Result } from "../core/result";
import type { Runner } from "../core/run";
import { parseJson } from "../pr/gh-records";
import { ownerOf } from "../workspaces/owner";

const KNOWN_STATES = ["working", "done", "blocked", "stopped"] as const;
export type AgentState = (typeof KNOWN_STATES)[number] | "unknown";

// One row of `claude agents --json --all` (Claude Code 2.1.296), narrowed to what the overseer acts on.
// Separate from `LiveSession`: this list has no `procStart` or `updatedAt`, and it lists stopped
// background sessions that have no process at all.
export interface Agent {
  // Background sessions only: the short id `claude stop|rm|attach` take.
  id?: string;
  sessionId: string;
  name?: string;
  cwd: string;
  kind: string;
  pid?: number;
  status?: string;
  // Background sessions only. `blocked` with `waitingFor` waits in its UI; without it the turn ended on text.
  state?: AgentState;
  waitingFor?: string;
}

export function loadAgents(runner: Runner): Result<Agent[]> {
  const result = runner.run(["claude", "agents", "--json", "--all"]);
  if (result.code !== 0) return { ok: false, reason: `claude agents failed: ${result.stderr.trim().split("\n")[0] || `exit ${result.code}`}` };
  return parseAgents(result.stdout);
}

export function parseAgents(text: string): Result<Agent[]> {
  const data = parseJson(text);
  if (!Array.isArray(data)) return { ok: false, reason: "claude agents --json printed no session list" };
  return { ok: true, value: data.filter(isRecord).flatMap((row) => toAgent(row) ?? []) };
}

// The list spans every repo on the machine (gotcha-session-files-span-every-repo).
export function ownedAgents(agents: readonly Agent[], worktrees: readonly string[]): Agent[] {
  return agents.filter((agent) => ownerOf(agent.cwd, worktrees) !== undefined);
}

function toAgent(row: FrontmatterData): Agent | undefined {
  const sessionId = stringField(row, "sessionId");
  const cwd = stringField(row, "cwd");
  const kind = stringField(row, "kind");
  if (!sessionId || !cwd || !kind) return undefined;
  const id = stringField(row, "id");
  const name = stringField(row, "name");
  const pid = numberField(row, "pid");
  const status = stringField(row, "status");
  const state = toState(stringField(row, "state"));
  const waitingFor = stringField(row, "waitingFor");
  return {
    sessionId,
    cwd,
    kind,
    ...(id ? { id } : {}),
    ...(name ? { name } : {}),
    ...(pid !== undefined ? { pid } : {}),
    ...(status ? { status } : {}),
    ...(state ? { state } : {}),
    ...(waitingFor ? { waitingFor } : {}),
  };
}

function toState(value: string | undefined): AgentState | undefined {
  if (value === undefined) return undefined;
  return isKnownState(value) ? value : "unknown";
}

function isKnownState(value: string): value is (typeof KNOWN_STATES)[number] {
  return (KNOWN_STATES as readonly string[]).includes(value);
}
