import { parseLaunchTitle } from "../launch/title";
import type { Agent } from "../sessions/agents";

export const MACHINE_WORKERS = 6;

// Every repo's workers on this machine share its cores, so the roster is read unfiltered. A done worker
// waiting for close-out holds no slot.
export function machineWorkers(agents: readonly Agent[]): number {
  return agents.filter((agent) => (agent.state === "working" || agent.state === "blocked") && parseLaunchTitle(agent.name ?? "")?.sub === "execute").length;
}

export function machineFree(busy: number): number {
  return Math.max(0, MACHINE_WORKERS - busy);
}
