import type { RecordPlan } from "../record/write";
import type { CardEnd } from "./card-doc";
import { cardDocPath } from "./paths";
import { cardPlan, findCard, type See } from "./plans";

// `done` needs evidence (a merged commit, a data check, the assignee's word); `dropped` a reason.
export interface CloseCardIntent extends CardEnd {
  id: string;
  status: "done" | "dropped";
}

export function closeCardPlan(intent: CloseCardIntent, see?: See): RecordPlan {
  return cardPlan((view) => {
    const card = findCard(view, intent.id);
    if (typeof card === "string") return { refused: card };
    if (card.status === intent.status) return { unchanged: `card: ${card.id} is already ${card.status}` };
    if (card.closed) return { refused: `${card.id} was ${card.status} ${card.closed.at} by ${card.closed.by}: "${card.closed.why}"` };
    const closed: CardEnd = { at: intent.at, by: intent.by, why: intent.why };
    const ops = [{ op: "update" as const, path: cardDocPath(card.id), patch: { status: intent.status, closed } }];
    return { ops, line: `card: ${card.id} ${intent.status} — "${intent.why}"`, message: `record: card ${intent.status === "done" ? "close" : "drop"} ${card.id}` };
  }, see);
}
