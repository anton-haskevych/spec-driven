import type { FrontmatterData } from "../core/frontmatter";
import { oneOf, optionalText, requiredText, stringArray, withoutUndefined } from "../core/read-fields";
import { readSchedule, type Priority } from "../core/schedule";
import { readObject, type DocRead } from "../plan/docs/read";
import { contactProblems } from "./contact";
import { isCardId } from "./paths";

export const CARD_STATUSES = ["open", "doing", "done", "dropped"] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];
export const COMMITMENTS = ["promised", "asked", "idea"] as const;
export type Commitment = (typeof COMMITMENTS)[number];

// What someone wants, in one line, with what covers it. Never deleted: closed (done) or dropped.
// `coveredBy` holds `<spec>` or `<spec>#<phase|N-M>`; the spec side is computed from it.
export interface CardDoc {
  id: string;
  title: string;
  status: CardStatus;
  commitment: Commitment;
  priority?: Priority;
  due?: string;
  assignee?: string;
  tags: string[];
  coveredBy: string[];
  note?: string;
  createdAt: string;
}

const FIELDS = new Set(["id", "title", "status", "commitment", "priority", "due", "assignee", "tags", "coveredBy", "note", "createdAt"]);
const COVER_REF = /^[^#\s]+(#\S+)?$/;

export function readCardDoc(value: unknown): DocRead<CardDoc> {
  return readObject(value, "card", readCardFields);
}

function readCardFields(fields: FrontmatterData, problems: string[]): CardDoc {
  const schedule = readSchedule(fields);
  const doc = withoutUndefined({
    id: cardId(fields.id, "id", problems),
    title: requiredText(fields.title, "title", problems) ?? "",
    status: required(oneOf(fields.status, CARD_STATUSES, "status", problems), "status", CARD_STATUSES, fields.status, problems),
    commitment: required(oneOf(fields.commitment, COMMITMENTS, "commitment", problems), "commitment", COMMITMENTS, fields.commitment, problems),
    priority: schedule.priority,
    due: schedule.due,
    assignee: optionalText(fields.assignee, "assignee", problems),
    tags: stringArray(fields.tags, "tags", problems),
    coveredBy: coverRefs(fields.coveredBy, problems),
    note: optionalText(fields.note, "note", problems),
    createdAt: requiredText(fields.createdAt, "createdAt", problems) ?? "",
  });
  problems.push(...schedule.problems);
  problems.push(...Object.keys(fields).filter((key) => !FIELDS.has(key)).map((key) => `unknown field: ${key}`));
  problems.push(...contactProblems("title", doc.title), ...contactProblems("note", doc.note));
  return doc;
}

export function cardId(value: unknown, key: string, problems: string[]): string {
  if (isCardId(value)) return value;
  problems.push(`${key} must look like c<n>, not "${String(value)}"`);
  return "";
}

function required<T extends string>(read: T | undefined, key: string, allowed: readonly T[], raw: unknown, problems: string[]): T {
  if (raw === undefined) problems.push(`${key} must be ${allowed.join(", ")}`);
  return read ?? allowed[0]!;
}

function coverRefs(value: unknown, problems: string[]): string[] {
  const refs = stringArray(value, "coveredBy", problems);
  problems.push(...refs.filter((ref) => !COVER_REF.test(ref)).map((ref) => `coveredBy: "${ref}" is not <spec> or <spec>#<phases>`));
  return refs;
}
