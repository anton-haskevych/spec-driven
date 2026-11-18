import type { Result } from "../core/result";
import type { Runner } from "../core/run";
import { parseLaunchTitle } from "../launch/title";
import type { LiveSession } from "../sessions/live";
import { listRunFiles, runFileStore } from "./deps";
import { whoseRun } from "./overseer";
import { parseRunFile, type RunFile } from "./run-state";

export type CrewScope = { spec: string } | { overseen: ReadonlySet<string> };

interface ScopedWorld {
  ready: ReadonlyArray<{ spec: string }>;
  questions?: ReadonlyArray<{ spec: string }>;
}

export function inScope(spec: string, scope: CrewScope): boolean {
  return "spec" in scope ? spec === scope.spec : !scope.overseen.has(spec);
}

export function scopeWorld<World extends ScopedWorld>(world: World, scope: CrewScope): World {
  if ("overseen" in scope && scope.overseen.size === 0) return world;
  const kept = <Row extends { spec: string }>(rows: readonly Row[]) => rows.filter((row) => inScope(row.spec, scope));
  return { ...world, ready: kept(world.ready), ...(world.questions ? { questions: kept(world.questions) } : {}) };
}

export function isRunOpen(run: RunFile): boolean {
  return run.state !== "stood-down" && run.state !== "finished";
}

// Not liveness: workers outlive their overseer, so a dead overseer's spec stays overseen.
export function specRun(projectDir: string, runner: Runner, spec: string): Result<RunFile | undefined> {
  const store = runFileStore(projectDir, runner, spec);
  if (!store.ok) return store;
  const text = store.value.read();
  const run = text === undefined ? undefined : parseRunFile(text);
  return { ok: true, value: run && isRunOpen(run) ? run : undefined };
}

export function openSpecRuns(projectDir: string, runner: Runner): Result<RunFile[]> {
  const listed = listRunFiles(projectDir, runner);
  if (!listed.ok) return listed;
  const runs = listed.value.flatMap(({ spec, store }) => {
    const text = spec === undefined ? undefined : store.read();
    const run = text === undefined ? undefined : parseRunFile(text);
    return run && isRunOpen(run) ? [{ ...run, spec }] : [];
  });
  return { ok: true, value: runs };
}

export function overseenLines(runs: readonly RunFile[], sessions: readonly LiveSession[], own: string | undefined): string[] {
  return runs.flatMap((run) => {
    if (whoseRun(run.overseer, sessions, own).kind !== "take-over") return [];
    const workers = run.launched.filter((entry) => parseLaunchTitle(entry.title)?.sub === "execute").length;
    return [`Overseen: ${run.spec} (no live overseer, ${workers} ${workers === 1 ? "worker" : "workers"})`];
  });
}
