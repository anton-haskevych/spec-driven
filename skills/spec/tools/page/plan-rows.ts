import type { TagDoc } from "../cards/tag-doc";
import { priorityRank } from "../core/schedule";
import { parseRef } from "../graph/relations";
import { dueWord, type DueWord } from "./due";
import type { PageCard, PlanRow, SpecPanel, Who } from "./model";

export interface PlanContext {
  now: Date;
}

const NO_TAG = "No tag";

// The Academy board's By scope: a row per tag, P0 first; a card with two tags is in both rows. Closed rows
// (nothing left open) and untagged cards come last.
export function planRows(cards: readonly PageCard[], tags: readonly TagDoc[], context: PlanContext): PlanRow[] {
  const names = new Map<string, string>();
  for (const name of [...tags.map((tag) => tag.name), ...cards.flatMap((card) => card.tags)]) if (!names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  const details = new Map(tags.map((tag) => [tag.name.toLowerCase(), tag]));
  const rows = [...names].map(([key, name]) => planRow(name, details.get(key), cards.filter((card) => card.tags.some((tag) => tag.toLowerCase() === key)), context));
  const untagged = cards.filter((card) => card.tags.length === 0);
  const ranked = rows.toSorted((a, b) => Number(a.closed) - Number(b.closed) || priorityRank(a.priority) - priorityRank(b.priority) || a.tag.localeCompare(b.tag));
  return untagged.length > 0 ? [...ranked, { ...planRow(NO_TAG, undefined, untagged, context), untagged: true }] : ranked;
}

function planRow(name: string, tag: TagDoc | undefined, cards: readonly PageCard[], context: PlanContext): PlanRow {
  const open = cards.filter((card) => card.stage !== "done").toSorted(byMovingThenDue);
  const due = nearestDue(open, context.now);
  const waits = open.filter((card) => card.question).length;
  return {
    tag: name,
    ...(tag?.priority ? { priority: tag.priority } : {}),
    ...(tag?.summary ? { reason: tag.summary } : {}),
    counts: { done: cards.length - open.length, moving: open.filter((card) => card.stage === "moving").length, todo: open.filter((card) => card.stage === "todo").length },
    who: whoOn(open),
    due,
    waits,
    unfolded: due.kind === "late" || waits > 0,
    closed: cards.length > 0 && open.length === 0,
    panels: specPanels(open),
    open: open.filter((card) => card.covers.length === 0).map((card) => card.id),
    done: cards.filter((card) => card.stage === "done").map((card) => card.id),
  };
}

function byMovingThenDue(a: PageCard, b: PageCard): number {
  const moving = Number(b.stage === "moving") - Number(a.stage === "moving");
  return moving || (a.due.day ?? "9999").localeCompare(b.due.day ?? "9999");
}

function nearestDue(cards: readonly PageCard[], now: Date): DueWord {
  const days = cards.flatMap((card) => card.due.day ?? []).toSorted();
  return dueWord(days[0], now);
}

function whoOn(cards: readonly PageCard[]): Who[] {
  const who = new Map<string, Who>();
  for (const each of cards.flatMap((card) => card.who)) who.set(each.person, { person: each.person, writing: (who.get(each.person)?.writing ?? false) || each.writing });
  return [...who.values()];
}

// One panel per covering spec, with its latest session; a card covered by two specs sits in its first one's.
function specPanels(cards: readonly PageCard[]): SpecPanel[] {
  const panels = new Map<string, SpecPanel>();
  for (const card of cards) {
    const first = card.covers[0];
    if (first === undefined) continue;
    const spec = parseRef(first).target;
    const panel = panels.get(spec) ?? { spec, cards: [] };
    const session = card.sessions.find((each) => each.spec === spec);
    if (!panel.session && session) panel.session = session;
    panel.cards.push(card.id);
    panels.set(spec, panel);
  }
  return [...panels.values()];
}
