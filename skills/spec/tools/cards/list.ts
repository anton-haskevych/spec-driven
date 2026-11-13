import { compareSchedule, priorityRank } from "../core/schedule";
import { readTags, tagLabel } from "./tags";
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

export interface TagGroup {
  heading: string;
  rows: CardRow[];
}

const NO_TAG = "No tag";

// The list by tag: a card sits under each of its tags; tags by their priority, then name; untagged last.
export function groupByTag(rows: readonly CardRow[], view: RecordView): TagGroup[] {
  const details = new Map(readTags(view).map((tag) => [tag.name.toLowerCase(), tag]));
  const names = [...new Set(rows.flatMap((row) => row.card.tags))];
  const ranked = names.toSorted((a, b) => priorityRank(details.get(a.toLowerCase())?.priority) - priorityRank(details.get(b.toLowerCase())?.priority) || a.localeCompare(b));
  const groups = ranked.map((name) => {
    const tag = details.get(name.toLowerCase());
    return { heading: tag ? tagLabel(tag) : name, rows: rows.filter((row) => row.card.tags.includes(name)) };
  });
  const untagged = rows.filter((row) => row.card.tags.length === 0);
  return untagged.length > 0 ? [...groups, { heading: NO_TAG, rows: untagged }] : groups;
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
