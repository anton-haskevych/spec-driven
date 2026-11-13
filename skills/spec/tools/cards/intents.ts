import { isPlainObject } from "../record/document";
import type { RecordPlan } from "../record/write";
import { readSourceDoc, type SourceDoc } from "./source-doc";
import { cardSourcePlan, updateCardPlan, type CardFields, type See, type UpdateCardIntent } from "./plans";

export const CARD_COMMAND = "card";

// A card change that may wait in the outbox: everything but `card add`, which refuses offline because
// Claude quotes the new number at once.
export type CardIntent = ({ action: "update" } & UpdateCardIntent) | { action: "source"; source: SourceDoc };

export function cardIntentPlan(intent: CardIntent, see?: See): RecordPlan {
  return intent.action === "update" ? updateCardPlan(intent, see) : cardSourcePlan(intent.source, see);
}

export function readCardIntent(args: unknown): CardIntent | undefined {
  if (!isPlainObject(args)) return undefined;
  if (args.action === "source") {
    const source = readSourceDoc(args.source).doc;
    return source ? { action: "source", source } : undefined;
  }
  if (args.action !== "update" || typeof args.id !== "string" || !isPlainObject(args.fields)) return undefined;
  const ifVersion = typeof args.ifVersion === "string" ? { ifVersion: args.ifVersion } : {};
  return { action: "update", id: args.id, fields: args.fields as CardFields, ...ifVersion };
}
