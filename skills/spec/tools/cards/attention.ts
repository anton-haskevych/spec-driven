import { parseRef, phasesInRef } from "../graph/relations";
import type { CardDoc } from "./card-doc";

// Where one phase stands for a card: `finished` once merged, deployed, or a task phase done.
export interface CoveredPhase {
  id: string;
  stage: string;
  finished: boolean;
}

export type CardAttention =
  | { kind: "card-close"; card: string; title: string; covers: string[] }
  | { kind: "card-open"; card: string; title: string; open: string[] };

// The board proposes a close; Claude closes it with evidence, since merged isn't always live or told.
// A card marked done while a covering phase is open is flagged (wave 1: c38 read as open after its demo).
export function cardAttention(cards: readonly CardDoc[], phasesOf: (spec: string) => readonly CoveredPhase[] | undefined): CardAttention[] {
  return cards.flatMap((card): CardAttention[] => {
    const covered = card.coveredBy.flatMap((ref) => coveredPhases(ref, phasesOf));
    if (covered.length === 0) return [];
    const open = covered.filter(({ phase }) => !phase.finished);
    if ((card.status === "open" || card.status === "doing") && open.length === 0) return [{ kind: "card-close", card: card.id, title: card.title, covers: card.coveredBy }];
    if (card.status === "done" && open.length > 0) return [{ kind: "card-open", card: card.id, title: card.title, open: open.map(({ spec, phase }) => `${spec}#${phase.id} is ${phase.stage}`) }];
    return [];
  });
}

function coveredPhases(ref: string, phasesOf: (spec: string) => readonly CoveredPhase[] | undefined): { spec: string; phase: CoveredPhase }[] {
  const { target, phases } = parseRef(ref);
  const all = phasesOf(target) ?? [];
  const ids = phases ? new Set(phasesInRef(phases, all.map((phase) => phase.id))) : undefined;
  return all.filter((phase) => !ids || ids.has(phase.id)).map((phase) => ({ spec: target, phase }));
}
