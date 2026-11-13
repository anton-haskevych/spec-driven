import type { FrontmatterData } from "../core/frontmatter";
import { oneOf, optionalText, requiredText, withoutUndefined } from "../core/read-fields";
import { readObject, type DocRead } from "../plan/docs/read";

export const QUESTION_KINDS = ["question", "gate"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

// An answer is a quote: the person's words, who gave them and when.
export interface QuestionAnswer {
  text: string;
  by: string;
  at: string;
}

// One decision that waits on a person. `about` is "<spec>#<phase>", "<spec>#<phase>:<task>" or "card:<id>";
// a `gate` question is a Gate: task's approval and names that task.
export interface QuestionDoc {
  id: string;
  about: string;
  kind: QuestionKind;
  askedAt: string;
  askedBy: string;
  question: string;
  recommend?: string;
  answer?: QuestionAnswer;
}

export interface PhaseAbout {
  spec: string;
  phase: string;
  task?: string;
}

const QUESTION_ID = /^q([1-9]\d*)$/;
const PHASE_ABOUT = /^([^#\s]+)#([^:\s]+)(?::(\S+))?$/;
const CARD_ABOUT = /^card:\S+$/;

export function readQuestionDoc(value: unknown): DocRead<QuestionDoc> {
  return readObject(value, "question", readQuestionFields);
}

function readQuestionFields(fields: FrontmatterData, problems: string[]): QuestionDoc {
  const doc = withoutUndefined({
    id: questionId(fields.id, problems),
    about: about(fields.about, problems),
    kind: fields.kind === undefined ? missingKind(problems) : (oneOf(fields.kind, QUESTION_KINDS, "kind", problems) ?? "question"),
    askedAt: requiredText(fields.askedAt, "askedAt", problems) ?? "",
    askedBy: requiredText(fields.askedBy, "askedBy", problems) ?? "",
    question: requiredText(fields.question, "question", problems) ?? "",
    recommend: optionalText(fields.recommend, "recommend", problems),
    answer: readAnswer(fields.answer, problems),
  });
  if (problems.length === 0 && doc.kind === "gate" && aboutOf(doc.about)?.task === undefined) problems.push("a gate question is about a task: <spec>#<phase>:<task>");
  return doc;
}

function questionId(value: unknown, problems: string[]): string {
  if (typeof value === "string" && QUESTION_ID.test(value)) return value;
  problems.push(`id must look like q<n>, not "${String(value)}"`);
  return "";
}

function about(value: unknown, problems: string[]): string {
  if (typeof value === "string" && (PHASE_ABOUT.test(value) || CARD_ABOUT.test(value))) return value;
  problems.push(`about must be <spec>#<phase>, <spec>#<phase>:<task> or card:<id>, not "${String(value)}"`);
  return "";
}

function missingKind(problems: string[]): QuestionKind {
  problems.push(`kind must be ${QUESTION_KINDS.join(" or ")}`);
  return "question";
}

function readAnswer(value: unknown, problems: string[]): QuestionAnswer | undefined {
  if (value === undefined) return undefined;
  const fields = typeof value === "object" && value !== null && !Array.isArray(value) ? (value as FrontmatterData) : {};
  const own: string[] = [];
  const answer = { text: requiredText(fields.text, "text", own) ?? "", by: requiredText(fields.by, "by", own) ?? "", at: requiredText(fields.at, "at", own) ?? "" };
  problems.push(...own.map((problem) => `answer: ${problem}`));
  return own.length === 0 ? answer : undefined;
}

export function aboutPhase(spec: string, phase: string, task?: string): string {
  return `${spec}#${phase}${task ? `:${task}` : ""}`;
}

export function aboutOf(about: string): PhaseAbout | undefined {
  const match = PHASE_ABOUT.exec(about);
  if (!match?.[1] || !match[2]) return undefined;
  return withoutUndefined({ spec: match[1], phase: match[2], task: match[3] });
}

export function questionNumber(id: string): number {
  return Number(QUESTION_ID.exec(id)?.[1] ?? 0);
}

export function nextQuestionId(questions: readonly Pick<QuestionDoc, "id">[]): string {
  return `q${Math.max(0, ...questions.map((doc) => questionNumber(doc.id))) + 1}`;
}
