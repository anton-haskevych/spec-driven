import type { Agent } from "../sessions/agents";

export type RosterSnapshot = ReadonlyMap<string, string>;

export function rosterSnapshot(agents: readonly Agent[], ids: readonly string[]): RosterSnapshot {
  const lines = new Map<string, string>();
  for (const id of ids) {
    const agent = agents.find((candidate) => candidate.id === id);
    if (agent) lines.set(id, rosterLine(id, agent));
  }
  return lines;
}

// Gone ids first: a session removed outside the overseer needs its close-out before anything else.
export function rosterChange(before: RosterSnapshot | undefined, now: RosterSnapshot, ids: readonly string[]): string[] {
  const gone = ids.filter((id) => !now.has(id)).map((id) => `${id} gone`);
  const changed = before === undefined ? [] : [...now].filter(([id, line]) => before.get(id) !== line).map(([, line]) => line);
  return [...gone, ...changed];
}

function rosterLine(id: string, agent: Agent): string {
  const state = agent.state ?? agent.status ?? "unknown";
  return agent.waitingFor ? `${id} ${state} (${agent.waitingFor})` : `${id} ${state}`;
}
