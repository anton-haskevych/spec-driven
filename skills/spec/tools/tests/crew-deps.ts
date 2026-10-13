import type { RunResult, Runner } from "../core/run";
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

// `claude …` answers from `claude` (argv prefix → result); git runs for real with the isolated identity.
export function claudeAnd(claude: ReadonlyArray<readonly [readonly string[], Partial<RunResult>]>, calls: string[][] = []): Runner {
  return {
    run(argv, options) {
      if (argv[0] !== "claude") return isolatedRunner.run(argv, options);
      calls.push([...argv]);
      const match = claude.find(([prefix]) => prefix.every((part, index) => argv[index] === part));
      return { code: 0, stdout: "", stderr: "", ...(match ? match[1] : { code: 1, stderr: "no canned claude result" }) };
    },
  };
}

export function agentsJson(rows: ReadonlyArray<{ id: string; cwd: string; state: string; name?: string }>): Partial<RunResult> {
  return { stdout: JSON.stringify(rows.map((row) => ({ ...row, sessionId: `${row.id}-0000`, kind: "background" }))) };
}
