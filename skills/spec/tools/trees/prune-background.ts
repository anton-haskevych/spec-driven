import { spawn } from "node:child_process";
import { mkdirSync, openSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { livePid, readText } from "../core/pid-file";

export type Spawner = (argv: readonly string[], options: { cwd: string; logFile: string }) => number | undefined;

// detached = setsid: closing the session's tab must not kill a removal halfway; no pipe back, so the caller returns at once.
export const detachedSpawner: Spawner = (argv, { cwd, logFile }) => {
  const [command, ...rest] = argv;
  if (!command) return undefined;
  const log = openSync(logFile, "w");
  const child = spawn(command, rest, { cwd, detached: true, stdio: ["ignore", log, log] });
  child.unref();
  return child.pid;
};

export function backgroundPruneArgv(): string[] {
  return [process.execPath, join(import.meta.dir, "..", "spec.ts"), "trees", "prune", "--auto", "--wait"];
}

function files(dir: string) {
  return { pid: join(dir, "running.pid"), last: join(dir, "last.txt"), log: join(dir, "last.log") };
}

export function startBackgroundPrune(projectDir: string, dir: string, spawner: Spawner, argv: readonly string[]): string {
  mkdirSync(dir, { recursive: true });
  const { pid, last, log } = files(dir);
  const previous = readText(last);
  const lastRun = previous ? ` · last run: ${previous}` : "";
  if (livePid(pid) !== undefined) return `Pruning merged trees: still running from an earlier handoff${lastRun}`;
  const started = spawner(argv, { cwd: projectDir, logFile: log });
  if (started === undefined) return `trees: could not start the background prune${lastRun}`;
  writeFileSync(pid, String(started));
  return `Pruning merged trees in the background${lastRun}`;
}

export function recordPruneRun(dir: string, summary: string): void {
  mkdirSync(dir, { recursive: true });
  const { pid, last } = files(dir);
  writeFileSync(`${last}.tmp`, summary);
  renameSync(`${last}.tmp`, last);
  rmSync(pid, { force: true });
}
