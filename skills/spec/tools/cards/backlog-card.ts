import { relative } from "node:path";
import type { BacklogItem } from "../backlog/items";
import { withoutUndefined } from "../core/read-fields";
import type { RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import { addCardEdit, cardPlan, type AddCardIntent, type See } from "./plans";
import { readCards, readSources } from "./read";

export const BACKLOG_APP = "backlog";

// A backlog file becomes an idea card the next time it is touched: its body is the quote, the file is
// where it was said, and its tags, priority and due date carry over.
export function backlogCardIntent(item: BacklogItem, ref: string, at: string, coveredBy: readonly string[]): AddCardIntent {
  return withoutUndefined({
    title: item.title,
    commitment: "idea" as const,
    priority: item.priority,
    due: item.due,
    tags: item.tags,
    coveredBy: coveredBy.length > 0 ? [...coveredBy] : undefined,
    at,
    origin: { app: BACKLOG_APP, occurredAt: item.created ?? at, quote: item.body || item.title, ref },
  });
}

// Planned at the tip: of two sessions importing the same file, the second finds the first's card.
export function importCardPlan(intent: AddCardIntent, see?: See): RecordPlan {
  return cardPlan((view) => {
    const card = cardFrom(view, intent.origin.ref);
    return card ? { refused: `${intent.origin.ref} is already card ${card}` } : addCardEdit(view, intent);
  }, see);
}

// The list's ideas on the board: open cards that nothing covers. A covered card shows through its spec.
export function cardIdeas(view: RecordView): BacklogItem[] {
  return readCards(view)
    .filter((card) => (card.status === "open" || card.status === "doing") && card.coveredBy.length === 0)
    .map((card) => withoutUndefined({ file: "", card: card.id, slug: card.id, title: card.title, body: card.note ?? "", tags: card.tags, priority: card.priority, due: card.due }));
}

// Backlog files no card came from yet.
export function remainingFiles(items: readonly BacklogItem[], view: RecordView, projectDir: string): BacklogItem[] {
  const imported = new Set(readCards(view).flatMap((card) => readSources(view, card.id).map((source) => source.ref)));
  return items.filter((item) => !imported.has(relative(projectDir, item.file)));
}

function cardFrom(view: RecordView, ref: string): string | undefined {
  return readCards(view).find((card) => readSources(view, card.id).some((source) => source.ref === ref))?.id;
}
