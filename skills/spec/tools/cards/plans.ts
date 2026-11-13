import { withoutUndefined } from "../core/read-fields";
import type { Priority } from "../core/schedule";
import type { RecordOp } from "../record/plan-writes";
import type { RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import { readCardDoc, type CardDoc, type Commitment } from "./card-doc";
import { cardDocPath, cardNumber, nextSourceLetter, sourceDocPath, sourcesFolder } from "./paths";
import { cardPaths, readSourceEntries } from "./read";
import type { SourceDoc } from "./source-doc";

export type OriginQuote = Omit<SourceDoc, "card" | "role">;

export interface AddCardIntent {
  title: string;
  commitment: Commitment;
  priority?: Priority;
  due?: string;
  assignee?: string;
  tags: string[];
  note?: string;
  at: string;
  origin: OriginQuote;
}

// `null` removes a field. Status moves only between open and doing here; close and drop end a card.
export interface CardFields {
  title?: string;
  commitment?: Commitment;
  status?: "open" | "doing";
  priority?: Priority | null;
  due?: string | null;
  assignee?: string | null;
  note?: string | null;
}

export interface UpdateCardIntent {
  id: string;
  fields: CardFields;
  ifVersion?: string;
}

export type See = (line: string) => void;
export type CardEdit = { ops: RecordOp[]; line: string; message: string } | { refused: string } | { unchanged: string };

// A card edit planned at each tip: what it reads (the next number, the card's state) is read there.
export function cardPlan(edit: (view: RecordView) => CardEdit, see: See = () => {}): RecordPlan {
  return (view) => {
    const planned = edit(view);
    if ("refused" in planned) return planned;
    if ("unchanged" in planned) {
      see(planned.unchanged);
      return { unchanged: true };
    }
    see(planned.line);
    return { ops: planned.ops, message: planned.message };
  };
}

export function addCardPlan(intent: AddCardIntent, see?: See): RecordPlan {
  return cardPlan((view) => addEdit(view, intent), see);
}

export function updateCardPlan(intent: UpdateCardIntent, see?: See): RecordPlan {
  return cardPlan((view) => updateEdit(view, intent), see);
}

export function cardSourcePlan(source: SourceDoc, see?: See): RecordPlan {
  return cardPlan((view) => sourceEdit(view, source), see);
}

export function nextCardId(view: RecordView): string {
  const numbers = cardPaths(view).map((path) => cardNumber(fileStem(path)) ?? 0);
  return `c${Math.max(0, ...numbers) + 1}`;
}

export function findCard(view: RecordView, id: string): CardDoc | string {
  return readCardDoc(view.doc(cardDocPath(id))).doc ?? `no card ${id} on the board`;
}

function addEdit(view: RecordView, intent: AddCardIntent): CardEdit {
  const id = nextCardId(view);
  const { origin, at, ...fields } = intent;
  const card: CardDoc = withoutUndefined({ id, title: fields.title, status: "open" as const, commitment: fields.commitment, priority: fields.priority, due: fields.due, assignee: fields.assignee, tags: fields.tags, coveredBy: [], note: fields.note, createdAt: at });
  const ops: RecordOp[] = [
    { op: "create", path: cardDocPath(id), doc: card },
    { op: "create", path: sourceDocPath(id, "a"), doc: { card: id, role: "origin", ...origin } },
  ];
  return { ops, line: `card: ${id} added (${cardSummary(card)})`, message: `record: card add ${id}` };
}

export function cardSummary(card: Pick<CardDoc, "commitment" | "priority" | "tags">): string {
  return [card.commitment, card.priority, card.tags.length > 0 ? `tags: ${card.tags.join(", ")}` : undefined].filter(Boolean).join(" · ");
}

function updateEdit(view: RecordView, intent: UpdateCardIntent): CardEdit {
  const card = openCard(view, intent.id);
  if (typeof card === "string") return { refused: card };
  const current: { [K in keyof CardFields]?: unknown } = card;
  const patch = Object.fromEntries(Object.entries(intent.fields).filter(([key, value]) => value !== undefined && current[key as keyof CardFields] !== (value ?? undefined)));
  if (Object.keys(patch).length === 0) return { unchanged: `card: ${card.id} already has those values` };
  const op: RecordOp = { op: "update", path: cardDocPath(card.id), patch, ...(intent.ifVersion ? { ifVersion: intent.ifVersion } : {}) };
  const changes = Object.entries(patch).map(([key, value]) => (value === null ? `${key} removed` : `${key} ${String(value)}`));
  return { ops: [op], line: `card: ${card.id} updated (${changes.join(" · ")})`, message: `record: card update ${card.id}` };
}

export function openCard(view: RecordView, id: string): CardDoc | string {
  const card = findCard(view, id);
  if (typeof card === "string") return card;
  return card.status === "done" || card.status === "dropped" ? `${id} is ${card.status}; a closed card isn't edited` : card;
}

function sourceEdit(view: RecordView, source: SourceDoc): CardEdit {
  const card = findCard(view, source.card);
  if (typeof card === "string") return { refused: card };
  const entries = readSourceEntries(view, card.id);
  const same = entries.find((entry) => entry.doc.quote === source.quote && entry.doc.role === source.role);
  if (same) return { unchanged: `card: ${card.id} already has that quote (${same.letter})` };
  const origin = entries.find((entry) => entry.doc.role === "origin");
  if (source.role === "origin" && origin) return { refused: `${card.id} already has its origin (${origin.letter}); add this one as a mention` };
  const letter = nextSourceLetter(view.paths().filter((path) => path.startsWith(sourcesFolder(card.id))).map(fileStem));
  const op: RecordOp = { op: "create", path: sourceDocPath(card.id, letter), doc: source };
  return { ops: [op], line: `card: ${card.id} · source ${letter} added (${source.role}, ${source.app})`, message: `record: card source ${card.id} ${letter}` };
}

function fileStem(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.json$/, "");
}
