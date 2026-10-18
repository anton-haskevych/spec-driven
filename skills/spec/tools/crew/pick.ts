import type { ReadyRow } from "../board/model";
import { isOffered } from "../core/people";
import type { SpecState } from "../core/spec-state";
import type { OpenQuestion } from "./run-state";

export interface Pick {
  spec: string;
  phase: string;
}

export interface PickInputs {
  ready: readonly ReadyRow[];
  states: ReadonlyMap<string, SpecState>;
  // Specs that already have a worker, or a relaunch waiting.
  busy: ReadonlySet<string>;
  unanswered: readonly OpenQuestion[];
  slots: number;
  // run.md `runner:`: the crew offers only this person's work and work nobody owns.
  me: string;
}

// oversee-crew.md §2. One worker per spec: shared spec docs conflict, and a just-launched worker
// hasn't claimed yet, so its phase still reads ready on the board until it does.
export function pickRows({ ready, states, busy, unanswered, slots, me }: PickInputs): Pick[] {
  const taken = new Set(busy);
  const picks: Pick[] = [];
  for (const row of ready) {
    if (picks.length >= slots) break;
    const phase = row.phase;
    if (row.next !== "execute" || phase === undefined || row.treeBusy || row.readyIn || row.onlyOn || taken.has(row.spec)) continue;
    if (!isOffered(row.owner, me)) continue;
    if (states.get(row.spec)?.phases.find((candidate) => candidate.id === phase)?.code === false) continue;
    if (unanswered.some((question) => question.spec === row.spec && question.phase === phase)) continue;
    taken.add(row.spec);
    picks.push({ spec: row.spec, phase });
  }
  return picks;
}
