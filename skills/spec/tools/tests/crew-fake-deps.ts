import { join } from "node:path";
import type { Runner } from "../core/run";
import type { CrewDeps } from "../crew/deps";
import type { LiveSession } from "../sessions/live";
import { asyncStubRunner, gitStub, type CannedRuns } from "./stub-runner";

export const CREW_NOW = new Date("2026-10-12T22:00:00-07:00");

export type CrewDepsOverrides = Partial<CrewDeps> & { sessions?: LiveSession[] };

export function crewDepsOn(runner: Runner, overrides: CrewDepsOverrides = {}): CrewDeps {
  const { sessions = [], ...rest } = overrides;
  return {
    runner,
    asyncRunner: asyncStubRunner([]),
    claudeHome: "/nonexistent-claude-home",
    env: {},
    now: () => CREW_NOW,
    liveSessions: () => ({ ok: true, value: sessions }),
    agents: () => ({ ok: true, value: [] }),
    ...rest,
  };
}

// No git at all: the checkout at `root` answers from gitStub, its common dir `<root>/.git`, and `claude …`
// from `claude`.
export function fastCrewDeps(root: string, overrides: CrewDepsOverrides & { claude?: CannedRuns } = {}): CrewDeps & { runner: Runner & { calls: string[][] } } {
  const { claude = [], ...rest } = overrides;
  const runner = gitStub({ commonDir: join(root, ".git"), toplevel: root, answers: claude });
  return { ...crewDepsOn(runner, rest), runner };
}
