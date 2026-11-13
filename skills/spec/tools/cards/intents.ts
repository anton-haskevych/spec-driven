import { isPlainObject } from "../record/document";
import type { RecordPlan } from "../record/write";
import { closeCardPlan, type CloseCardIntent } from "./close";
import { coverPlan, type CoverIntent } from "./cover";
import { readSourceDoc, type SourceDoc } from "./source-doc";
import { setTagPlan, tagCardPlan, type SetTagIntent, type TagCardIntent, type TagFields } from "./tags";
import { cardSourcePlan, updateCardPlan, type CardFields, type See, type UpdateCardIntent } from "./plans";

export const CARD_COMMAND = "card";

// A card change that may wait in the outbox: everything but `card add`, which refuses offline because
// Claude quotes the new number at once.
export type CardIntent = ({ action: "update" } & UpdateCardIntent) | { action: "source"; source: SourceDoc } | ({ action: "cover" } & CoverIntent) | ({ action: "close" } & CloseCardIntent)
  | ({ action: "tag" } & TagCardIntent)
  | ({ action: "tag-set" } & SetTagIntent);

export function cardIntentPlan(intent: CardIntent, see?: See): RecordPlan {
  if (intent.action === "update") return updateCardPlan(intent, see);
  if (intent.action === "cover") return coverPlan(intent, see);
  if (intent.action === "close") return closeCardPlan(intent, see);
  if (intent.action === "tag") return tagCardPlan(intent, see);
  if (intent.action === "tag-set") return setTagPlan(intent, see);
  return cardSourcePlan(intent.source, see);
}

export function readCardIntent(args: unknown): CardIntent | undefined {
  if (!isPlainObject(args)) return undefined;
  if (args.action === "source") {
    const source = readSourceDoc(args.source).doc;
    return source ? { action: "source", source } : undefined;
  }
  if (args.action === "cover" || args.action === "tag") return refListIntentOf(args, args.action);
  if (args.action === "tag-set") return typeof args.name === "string" && isPlainObject(args.fields) ? { action: "tag-set", name: args.name, fields: args.fields as TagFields, ...versionOf(args) } : undefined;
  if (args.action === "close") return closeIntentOf(args);
  if (args.action !== "update" || typeof args.id !== "string" || !isPlainObject(args.fields)) return undefined;
  return { action: "update", id: args.id, fields: args.fields as CardFields, ...versionOf(args) };
}

function refListIntentOf(args: Record<string, unknown>, action: "cover" | "tag"): CardIntent | undefined {
  const texts = (value: unknown) => (Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined);
  const [add, remove] = [texts(args.add), texts(args.remove)];
  return typeof args.id === "string" && add && remove ? { action, id: args.id, add, remove } : undefined;
}

function versionOf(args: Record<string, unknown>): { ifVersion?: string } {
  return typeof args.ifVersion === "string" ? { ifVersion: args.ifVersion } : {};
}

function closeIntentOf(args: Record<string, unknown>): CardIntent | undefined {
  const { id, status, at, by, why } = args;
  if (status !== "done" && status !== "dropped") return undefined;
  return [id, at, by, why].every((value) => typeof value === "string") ? { action: "close", id: String(id), status, at: String(at), by: String(by), why: String(why) } : undefined;
}
