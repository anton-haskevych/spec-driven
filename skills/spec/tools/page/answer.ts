import { isoTimestamp } from "../core/schedule";
import type { ChangeSeen } from "../plan/ops/change";
import { answerPlan, type AnswerIntent } from "../questions/plans";
import type { RecordWrite } from "../record/outbox";
import { isPlainObject } from "../record/document";
import type { RecordPlan } from "../record/write";

// The page's one edit. `ifVersion` is the question as the page showed it: one changed since is a conflict.
export interface AnswerBody {
  spec: string;
  id: string;
  text: string;
  ifVersion: string;
}

export interface AnswerDeps {
  // sendRecordIntent for this checkout: undefined when the repo has no origin.
  send(intent: AnswerIntent, plan: RecordPlan): Promise<RecordWrite | undefined>;
  by: string;
  now(): Date;
}

export interface AnswerReply {
  status: number;
  body: { ok: boolean; line: string; conflict?: true };
}

const MAX_ANSWER = 2_000;
const SPEC = /^[a-z0-9][a-z0-9._-]*$/i;
const QUESTION = /^q[1-9]\d*$/;

export function readAnswerBody(value: unknown): AnswerBody | string {
  if (!isPlainObject(value)) return "the answer must be a JSON object";
  const { spec, id, text, ifVersion } = value;
  if (typeof spec !== "string" || !SPEC.test(spec)) return "the answer names no spec";
  if (typeof id !== "string" || !QUESTION.test(id)) return "the answer names no question";
  if (typeof text !== "string" || text.trim() === "") return "an answer needs words";
  if (text.length > MAX_ANSWER) return `an answer is at most ${MAX_ANSWER} characters`;
  if (typeof ifVersion !== "string" || ifVersion === "") return "the answer names no version; reload the page";
  return { spec, id, text, ifVersion };
}

export async function answerFromPage(value: unknown, deps: AnswerDeps): Promise<AnswerReply> {
  const body = readAnswerBody(value);
  if (typeof body === "string") return reply(400, false, body);
  const intent: AnswerIntent = { spec: body.spec, id: body.id, text: body.text, by: deps.by, at: isoTimestamp(deps.now()), ifVersion: body.ifVersion };
  let seen: ChangeSeen | undefined;
  const written = await deps.send(intent, answerPlan(intent, (each) => (seen = each)));
  if (!written) return reply(409, false, "This repo has no origin; the board's record lives there.");
  switch (written.kind) {
    case "landed":
    case "unchanged":
      return reply(200, true, seen?.line ?? `question: ${body.id} answered`);
    case "queued":
      return reply(202, true, "Kept on this machine: origin can't be reached. It is sent with the next write.");
    case "conflict":
      return { status: 409, body: { ok: false, line: `${body.id} changed since this page showed it; here it is as it is now.`, conflict: true } };
    case "refused":
      return reply(409, false, written.reason);
    case "invalid":
      return reply(400, false, written.problems.join("; "));
    default:
      return reply(502, false, written.reason);
  }
}

function reply(status: number, ok: boolean, line: string): AnswerReply {
  return { status, body: { ok, line } };
}
