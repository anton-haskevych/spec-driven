import { parseRef, phasesInRef } from "../graph/relations";
import type { RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import { cardRows, quoteLine, type CardRow } from "./list";
import { cardPlan, openCard, type See } from "./plans";
import { cardDocPath } from "./paths";

export interface CoverIntent {
  id: string;
  add: string[];
  remove: string[];
}

type Phased = ReadonlyMap<string, { phases: readonly { id: string }[] }>;

// The ref grammar relations use: `<spec>`, `<spec>#<phase>` or `<spec>#<N-M>`, resolved against the specs.
export function coverRefProblem(ref: string, specs: Phased): string | undefined {
  const { target, phases } = parseRef(ref);
  const spec = specs.get(target);
  if (!spec) return `no spec named ${target}`;
  const ids = spec.phases.map((phase) => phase.id);
  return phases && phasesInRef(phases, ids).length === 0 ? `${target} has no phase ${phases} (phases: ${ids.join(", ") || "none"})` : undefined;
}

// The link lives on the card only; a spec's covering cards are computed from it.
export function coverPlan(intent: CoverIntent, see?: See): RecordPlan {
  return cardPlan((view) => {
    const card = openCard(view, intent.id);
    if (typeof card === "string") return { refused: card };
    const kept = card.coveredBy.filter((ref) => !intent.remove.includes(ref));
    const coveredBy = [...kept, ...intent.add.filter((ref) => !kept.includes(ref))];
    const line = `card: ${card.id} covered by ${coveredBy.join(", ") || "nothing"}`;
    if (coveredBy.join("\n") === card.coveredBy.join("\n")) return { unchanged: line };
    return { ops: [{ op: "update", path: cardDocPath(card.id), patch: { coveredBy } }], line, message: `record: card cover ${card.id}` };
  }, see);
}

export function coveringCards(view: RecordView, spec: string): CardRow[] {
  return cardRows(view).filter((row) => refsTo(row.card.coveredBy, spec).length > 0);
}

// What a pack shows: each open card that covers the spec, with the customer's words.
export function coverLines(rows: readonly CardRow[], spec: string): string[] {
  return rows.flatMap(({ card, origin }) => {
    const phases = refsTo(card.coveredBy, spec).map((ref) => parseRef(ref).phases);
    const scope = phases.includes(undefined) ? "the whole spec" : `${phases.length === 1 && !phases[0]?.includes("-") ? "phase" : "phases"} ${phases.join(", ")}`;
    const label = [card.priority, card.commitment].filter(Boolean).join(" · ");
    return [`Card ${card.id} (${label}) covers ${scope}: ${card.title}`, ...(origin ? [`  ${quoteLine(origin)}`] : [])];
  });
}

function refsTo(refs: readonly string[], spec: string): string[] {
  return refs.filter((ref) => parseRef(ref).target === spec);
}
