import type { FrontmatterData } from "../../core/frontmatter";
import type { ParkEntry } from "../../core/park";
import { optionalText, requiredText, withoutUndefined } from "../../core/read-fields";

// A phase's parked questions on the record, in the shape `core/park.ts` reads from an in-flight note.
export function readParks(value: unknown, problems: string[]): ParkEntry[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    problems.push("parks must be a list");
    return undefined;
  }
  return value.map((item, index) => readPark(item, `park #${index + 1}`, problems));
}

function readPark(value: unknown, label: string, problems: string[]): ParkEntry {
  const fields = asFields(value);
  const own: string[] = [];
  const park = withoutUndefined({
    parkedAt: requiredText(fields.parkedAt, "parkedAt", own) ?? "",
    question: requiredText(fields.question, "question", own) ?? "",
    recommend: optionalText(fields.recommend, "recommend", own),
    answer: readAnswer(fields.answer, own),
  });
  problems.push(...own.map((problem) => `${label}: ${problem}`));
  return park;
}

function readAnswer(value: unknown, problems: string[]): ParkEntry["answer"] {
  if (value === undefined) return undefined;
  const fields = asFields(value);
  const at = typeof fields.at === "string" && fields.at.trim() !== "" ? fields.at : undefined;
  const text = typeof fields.text === "string" && fields.text.trim() !== "" ? fields.text : undefined;
  if (at && text) return { at, text };
  problems.push("answer must have at and text");
  return undefined;
}

function asFields(value: unknown): FrontmatterData {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as FrontmatterData) : {};
}
