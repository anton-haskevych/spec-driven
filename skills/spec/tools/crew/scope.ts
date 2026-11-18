import type { Result } from "../core/result";
import type { Runner } from "../core/run";
import { runFileStore } from "./deps";
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
