import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Env } from "../core/env";
import { readTextIfExists } from "../core/files";
import { gitAt, stateDir } from "../core/git";
import type { Result } from "../core/result";
import { systemAsyncRunner, systemRunner, type AsyncRunner, type Runner } from "../core/run";
import { defaultClaudeHome, loadLiveSessions, type LiveSession } from "../sessions/live";
import { psProcStarts } from "../sessions/proc-starts";

export interface CrewDeps {
  runner: Runner;
  asyncRunner: AsyncRunner;
  claudeHome: string;
  env: Env;
  now: () => Date;
  liveSessions: () => Result<LiveSession[]>;
}

export function systemCrewDeps(): CrewDeps {
  const claudeHome = defaultClaudeHome();
  return {
    runner: systemRunner,
    asyncRunner: systemAsyncRunner,
    claudeHome,
    env: process.env,
    now: () => new Date(),
    liveSessions: () => loadLiveSessions(claudeHome, psProcStarts(systemRunner)),
  };
}

export interface RunFileStore {
  path: string;
  read(): string | undefined;
  write(text: string): void;
}

export function runFileStore(projectDir: string, runner: Runner): Result<RunFileStore> {
  const dir = stateDir(gitAt(projectDir, runner), "crew");
  if (!dir.ok) return dir;
  const path = join(dir.value, "run.md");
  return {
    ok: true,
    value: {
      path,
      read: () => readTextIfExists(path),
      write: (text) => {
        mkdirSync(dir.value, { recursive: true });
        writeFileSync(path, text);
      },
    },
  };
}
