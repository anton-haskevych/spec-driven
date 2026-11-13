import { compareSchedule } from "../core/schedule";
import type { RecordView } from "../record/view";
import type { CardDoc } from "./card-doc";
import { cardNumber } from "./paths";
import { originOf, readCards } from "./read";
import type { SourceDoc } from "./source-doc";

export interface CardRow {
  card: CardDoc;
  origin?: SourceDoc;
}

// Open cards (all with `all`), most urgent first; `tag` keeps one tag's cards, matched without case.
export function cardRows(view: RecordView, options: { all?: boolean; tag?: string } = {}): CardRow[] {
  const tag = options.tag?.toLowerCase();
  return readCards(view)
    .filter((card) => options.all || card.status === "open" || card.status === "doing")
    .filter((card) => tag === undefined || card.tags.some((each) => each.toLowerCase() === tag))
    .toSorted((a, b) => compareSchedule(a, b) || (cardNumber(a.id) ?? 0) - (cardNumber(b.id) ?? 0))
    .map((card) => {
      const origin = originOf(view, card.id);
      return origin ? { card, origin } : { card };
    });
}

export function cardLine({ card, origin }: CardRow): string {
  const facts = [
    card.tags.length > 0 ? card.tags.join(", ") : undefined,
    card.assignee,
    card.due ? `due ${card.due}` : undefined,
    card.coveredBy.length > 0 ? `covered by ${card.coveredBy.join(", ")}` : "nothing covers it",
  ].filter(Boolean);
  const head = [card.id, card.priority, card.commitment, card.status].filter(Boolean).join(" · ");
  return [`${head} — ${card.title} · ${facts.join(" · ")}`, ...(origin ? [`  ${quoteLine(origin)}`] : [])].join("\n");
}

export function quoteLine(source: SourceDoc): string {
  const who = [source.person, source.app, source.occurredAt.slice(0, 10)].filter(Boolean).join(", ");
  return `“${source.quote}” — ${who}`;
}

export function cardsSummary(rows: readonly CardRow[], all: boolean): string {
  if (rows.length === 0) return all ? "card: none on the board" : "card: none open on the board";
  return `card: ${rows.length} ${all ? "" : "open "}${rows.length === 1 ? "card" : "cards"}`;
}
