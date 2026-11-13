import type { FrontmatterData } from "../core/frontmatter";
import { oneOf, optionalText, requiredText, withoutUndefined } from "../core/read-fields";
import { readObject, type DocRead } from "../plan/docs/read";
import { cardId } from "./card-doc";
import { contactProblems } from "./contact";

export const SOURCE_ROLES = ["origin", "mention", "evidence"] as const;
export type SourceRole = (typeof SOURCE_ROLES)[number];

// Someone's words about a card, quoted verbatim and never edited: a correction is a new source.
// A card has exactly one `origin`, written in the batch that creates the card.
export interface SourceDoc {
  card: string;
  role: SourceRole;
  app: string;
  person?: string;
  occurredAt: string;
  quote: string;
  ref: string;
  refUrl?: string;
}

const OCCURRED_AT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z))?$/;

export function readSourceDoc(value: unknown): DocRead<SourceDoc> {
  return readObject(value, "source", readSourceFields);
}

function readSourceFields(fields: FrontmatterData, problems: string[]): SourceDoc {
  const doc = withoutUndefined({
    card: cardId(fields.card, "card", problems),
    role: oneOf(fields.role, SOURCE_ROLES, "role", problems) ?? missing("role", fields.role, problems),
    app: requiredText(fields.app, "app", problems) ?? "",
    person: optionalText(fields.person, "person", problems),
    occurredAt: occurredAt(fields.occurredAt, problems),
    quote: requiredText(fields.quote, "quote", problems) ?? "",
    ref: requiredText(fields.ref, "ref", problems) ?? "",
    refUrl: optionalText(fields.refUrl, "refUrl", problems),
  });
  problems.push(...contactProblems("quote", doc.quote));
  return doc;
}

function missing(key: string, raw: unknown, problems: string[]): SourceRole {
  if (raw === undefined) problems.push(`${key} must be ${SOURCE_ROLES.join(", ")}`);
  return "origin";
}

function occurredAt(value: unknown, problems: string[]): string {
  if (typeof value === "string" && OCCURRED_AT.test(value)) return value;
  problems.push(`occurredAt "${String(value)}" is not a date or a time; use YYYY-MM-DD or ISO 8601 with an offset`);
  return "";
}
