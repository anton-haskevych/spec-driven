import type { Result } from "../core/result";
import type { PageModel } from "./model";

export const TICK_MS = 5_000;
export const REBUILD_MS = 60_000;

export interface RefreshDeps {
  // The record's tip after one fetch; undefined when there is no record or origin can't be reached.
  readTip(): string | undefined;
  buildModel(): Promise<Result<PageModel>>;
  now(): number;
}

export type TickResult = { kind: "rebuilt"; model: PageModel } | { kind: "same" } | { kind: "failed"; reason: string } | { kind: "busy" };

export interface Refresher {
  tick(): Promise<TickResult>;
  // Rebuild on the next tick, whatever the tip says: an answer just changed the record.
  rebuildNext(): void;
  current(): PageModel | undefined;
}

// A full load is too heavy for every few seconds: the tick reads the record's tip and rebuilds when it
// moved, when the last build is a minute old, or right after an answer.
export function shouldRebuild(facts: { tipMoved: boolean; sinceBuildMs: number | undefined; answered: boolean }): boolean {
  return facts.answered || facts.tipMoved || facts.sinceBuildMs === undefined || facts.sinceBuildMs >= REBUILD_MS;
}

export function refresher(deps: RefreshDeps): Refresher {
  let model: PageModel | undefined;
  let tip: string | undefined;
  let builtAt: number | undefined;
  let answered = false;
  let running = false;
  return {
    async tick() {
      if (running) return { kind: "busy" };
      running = true;
      try {
        const seen = deps.readTip();
        if (!shouldRebuild({ tipMoved: seen !== tip, sinceBuildMs: builtAt === undefined ? undefined : deps.now() - builtAt, answered })) return { kind: "same" };
        const built = await deps.buildModel();
        if (!built.ok) return { kind: "failed", reason: built.reason };
        [model, tip, builtAt, answered] = [built.value, seen, deps.now(), false];
        return { kind: "rebuilt", model: built.value };
      } finally {
        running = false;
      }
    },
    rebuildNext: () => {
      answered = true;
    },
    current: () => model,
  };
}
