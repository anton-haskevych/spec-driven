import type { CrewDeps } from "../crew/deps";
import type { LiveSession } from "../sessions/live";
import { isolatedAsyncRunner, isolatedRunner } from "./git-repo";

export const CREW_NOW = new Date("2026-10-12T22:00:00-07:00");

export function crewDeps(overrides: Partial<CrewDeps> & { sessions?: LiveSession[] } = {}): CrewDeps {
  const { sessions = [], ...rest } = overrides;
  return {
    runner: isolatedRunner,
    asyncRunner: isolatedAsyncRunner,
    claudeHome: "/nonexistent-claude-home",
    env: {},
    now: () => CREW_NOW,
    liveSessions: () => ({ ok: true, value: sessions }),
    ...rest,
  };
}
