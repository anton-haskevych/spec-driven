import type { ReadyRow } from "../board/model";
import type { SpecState } from "../core/spec-state";
import type { OpenQuestion } from "./run-state";

export interface Pick {
  spec: string;
  phase: string;
}

// oversee-crew.md §2. One worker per spec: shared spec docs conflict, and a just-launched worker
// hasn't claimed yet, so its phase still reads ready on the board until it does.
export function pickRows(ready: readonly ReadyRow[], states: ReadonlyMap<string, SpecState>, busySpecs: ReadonlySet<string>, unanswered: readonly OpenQuestion[], slots: number): Pick[] {
  const taken = new Set(busySpecs);
  const picks: Pick[] = [];
  for (const row of ready) {
    if (picks.length >= slots) break;
    const phase = row.phase;
    if (row.next !== "execute" || phase === undefined || row.treeBusy || row.readyIn || row.onlyOn || taken.has(row.spec)) continue;
    if (states.get(row.spec)?.phases.find((candidate) => candidate.id === phase)?.code === false) continue;
    if (unanswered.some((question) => question.spec === row.spec && question.phase === phase)) continue;
    taken.add(row.spec);
    picks.push({ spec: row.spec, phase });
  }
  return picks;
}
