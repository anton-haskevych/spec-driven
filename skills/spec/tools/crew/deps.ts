import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
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

// One run per crew: `run.md` for the whole board, `run-<spec>.md` for a crew on one spec.
export function runFileStore(projectDir: string, runner: Runner, spec?: string): Result<RunFileStore> {
  const dir = crewDir(projectDir, runner);
  return dir.ok ? { ok: true, value: storeAt(dir.value, runFileName(spec)) } : dir;
}

export interface ListedRun {
  spec?: string;
  store: RunFileStore;
}

const SPEC_RUN_FILE = /^run-(.+)\.md$/;

// The whole-board run first, then each spec's in name order.
export function listRunFiles(projectDir: string, runner: Runner): Result<ListedRun[]> {
  const dir = crewDir(projectDir, runner);
  if (!dir.ok) return dir;
  if (!existsSync(dir.value)) return { ok: true, value: [] };
  const names = readdirSync(dir.value).sort();
  const board: ListedRun[] = names.includes("run.md") ? [{ store: storeAt(dir.value, "run.md") }] : [];
  const specs = names.flatMap((name): ListedRun[] => {
    const spec = SPEC_RUN_FILE.exec(name)?.[1];
    return spec ? [{ spec, store: storeAt(dir.value, name) }] : [];
  });
  return { ok: true, value: [...board, ...specs] };
}

function runFileName(spec: string | undefined): string {
  return spec === undefined ? "run.md" : `run-${spec}.md`;
}

function crewDir(projectDir: string, runner: Runner): Result<string> {
  return stateDir(gitAt(projectDir, runner), "crew");
}

function storeAt(dir: string, name: string): RunFileStore {
  const path = join(dir, name);
  return {
    path,
    read: () => readTextIfExists(path),
    write: (text) => {
      mkdirSync(dir, { recursive: true });
      writeFileSync(path, text);
    },
  };
}
