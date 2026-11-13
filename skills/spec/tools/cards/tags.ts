import { withoutUndefined } from "../core/read-fields";
import type { Priority } from "../core/schedule";
import type { RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import { cardDocPath, tagDocPath, TAGS_FOLDER } from "./paths";
import { cardPlan, openCard, type See } from "./plans";
import { readCards } from "./read";
import { readTagDoc, type TagDoc, type TagKind } from "./tag-doc";

export interface TagCardIntent {
  id: string;
  add: string[];
  remove: string[];
}

export interface TagFields {
  kind?: TagKind;
  priority?: Priority | null;
  summary?: string | null;
}

export interface SetTagIntent {
  name: string;
  fields: TagFields;
  ifVersion?: string;
}

export function readTags(view: RecordView): TagDoc[] {
  return view.paths().filter((path) => path.startsWith(TAGS_FOLDER)).flatMap((path) => readTagDoc(view.doc(path)).doc ?? []);
}

// One spelling per tag: a name already on the board, matched without case, keeps the board's spelling.
export function spellingOf(view: RecordView, name: string): string {
  const known = [...readTags(view).map((tag) => tag.name), ...readCards(view).flatMap((card) => card.tags)];
  return known.find((each) => each.toLowerCase() === name.trim().toLowerCase()) ?? name.trim();
}

export function tagCardPlan(intent: TagCardIntent, see?: See): RecordPlan {
  return cardPlan((view) => {
    const card = openCard(view, intent.id);
    if (typeof card === "string") return { refused: card };
    const removed = new Set(intent.remove.map((name) => name.toLowerCase()));
    const kept = card.tags.filter((tag) => !removed.has(tag.toLowerCase()));
    const added = intent.add.map((name) => spellingOf(view, name)).filter((name, index, all) => all.indexOf(name) === index && !kept.includes(name));
    const tags = [...kept, ...added];
    const line = `card: ${card.id} tags ${tags.join(", ") || "none"}`;
    if (tags.join("\n") === card.tags.join("\n")) return { unchanged: line };
    return { ops: [{ op: "update", path: cardDocPath(card.id), patch: { tags } }], line, message: `record: card tag ${card.id}` };
  }, see);
}

// A tag's details: its kind, a priority on the one p0–p3 scale, a summary. `null` removes a field.
export function setTagPlan(intent: SetTagIntent, see?: See): RecordPlan {
  return cardPlan((view) => {
    const name = spellingOf(view, intent.name);
    const path = tagDocPath(name);
    const current = readTagDoc(view.doc(path)).doc;
    const next: TagDoc = withoutUndefined({ name, kind: intent.fields.kind ?? current?.kind ?? "other", priority: valueOf(intent.fields.priority, current?.priority), summary: valueOf(intent.fields.summary, current?.summary) });
    const line = `tag: ${tagLabel(next)}${next.summary ? ` — ${next.summary}` : ""}`;
    const message = `record: tag ${path.slice(TAGS_FOLDER.length, -".json".length)}`;
    if (!current) return { ops: [{ op: "create", path, doc: next }], line, message };
    const patch = Object.fromEntries(Object.entries(intent.fields).filter(([key, value]) => value !== undefined && fieldOf(current, key) !== (value ?? undefined)));
    if (Object.keys(patch).length === 0) return { unchanged: line };
    return { ops: [{ op: "update", path, patch, ...(intent.ifVersion ? { ifVersion: intent.ifVersion } : {}) }], line, message };
  }, see);
}

export function tagLabel(tag: TagDoc): string {
  return [tag.name, tag.kind, tag.priority].filter(Boolean).join(" · ");
}

function valueOf<T>(given: T | null | undefined, current: T | undefined): T | undefined {
  return given === null ? undefined : (given ?? current);
}

function fieldOf(tag: TagDoc, key: string): unknown {
  const fields: Record<string, unknown> = { ...tag };
  return fields[key];
}
