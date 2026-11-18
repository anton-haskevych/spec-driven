import type { ReadyRow } from "../board/model";
import { isOffered } from "../core/people";
import type { SpecState } from "../core/spec-state";
import { DEFAULT_PR_GROUP } from "../plan/docs/pr-doc";
import type { SpecLayout } from "../pr/groups";
import type { OpenQuestion } from "./run-state";

export interface Pick {
  spec: string;
  phase: string;
}

export interface PickInputs {
  ready: readonly ReadyRow[];
  states: ReadonlyMap<string, SpecState>;
  layouts: ReadonlyMap<string, SpecLayout>;
  // groupKeys that already have a worker, or a relaunch waiting.
  busy: ReadonlySet<string>;
  // Execute workers still in ## Launched: not closed out, so their phase may not be on feat/<spec> yet.
  launched: readonly Pick[];
  unanswered: readonly OpenQuestion[];
  slots: number;
  // run.md `runner:`: the crew offers only this person's work and work nobody owns.
  me: string;
}

// Trees cut from main conflict on shared spec docs; lanes don't, since each merges back through feat/<spec>.
export function groupKey(spec: string, group: string | undefined, layout: SpecLayout | undefined): string {
  return layout?.mode === "spec-branch" ? `${spec}#${group ?? DEFAULT_PR_GROUP}` : spec;
}

export function workKey(work: Pick, states: ReadonlyMap<string, SpecState>, layouts: ReadonlyMap<string, SpecLayout>): string {
  return groupKey(work.spec, phaseOf(states, work)?.edges.pr, layouts.get(work.spec));
}

// oversee-crew.md §2. A just-launched worker hasn't claimed yet, so its phase still reads ready on the board until it
// does: busy keeps a second worker off its unit.
export function pickRows({ ready, states, layouts, busy, launched, unanswered, slots, me }: PickInputs): Pick[] {
  const taken = new Set(busy);
  const picks: Pick[] = [];
  for (const row of ready) {
    if (picks.length >= slots) break;
    const phase = row.phase;
    if (row.next !== "execute" || phase === undefined || row.treeBusy || row.readyIn || row.onlyOn) continue;
    const work = { spec: row.spec, phase };
    const key = workKey(work, states, layouts);
    if (taken.has(key) || !isOffered(row.owner, me)) continue;
    if (phaseOf(states, work)?.code === false) continue;
    if (unanswered.some((question) => question.spec === row.spec && question.phase === phase)) continue;
    if (waitsOnOpenLane(work, states, layouts, launched)) continue;
    taken.add(key);
    picks.push(work);
  }
  return picks;
}

// A phase reads done at its last tick, before its handoff's merge-back --push; close-out proves it reached
// feat/<spec> (ledger: decision-cross-lane-needs-wait-for-close-out).
function waitsOnOpenLane(work: Pick, states: ReadonlyMap<string, SpecState>, layouts: ReadonlyMap<string, SpecLayout>, launched: readonly Pick[]): boolean {
  if (layouts.get(work.spec)?.mode !== "spec-branch") return false;
  const needs = phaseOf(states, work)?.edges.needs ?? [];
  return launched.some((out) => out.spec === work.spec && needs.includes(out.phase));
}

function phaseOf(states: ReadonlyMap<string, SpecState>, work: Pick) {
  return states.get(work.spec)?.phases.find((candidate) => candidate.id === work.phase);
}
