import { isGateItem } from "../core/gate";
import { allTasksDone, countTasks } from "../core/phase-entry";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import { questionDocPath } from "../plan/kinds";
import { findPhaseDoc, type ChangeSeen } from "../plan/ops/change";
import { oneLine, openRecordPark } from "../plan/ops/phase-state";
import { readJoinedPlan, type JoinedPlan } from "../plan/state-source";
import type { RecordOp } from "../record/plan-writes";
import type { RecordPlan } from "../record/write";
import { aboutPhase, nextQuestionId, type QuestionDoc } from "./question-doc";
import { openQuestionOn, questionsOn } from "./on-phase";

export interface AskIntent {
  spec: string;
  phase: string;
  question: string;
  recommend?: string;
  at: string;
  by: string;
}

// Names the question by id, or by the phase whose open question it is. `ifVersion`: the version the
// answerer read; a question changed since is a conflict.
export interface AnswerIntent {
  spec: string;
  id?: string;
  phase?: string;
  text: string;
  by: string;
  at: string;
  ifVersion?: string;
}

type See = (seen: ChangeSeen) => void;
type Planned = { op: RecordOp; line: string } | { refused: string } | { unchanged: string };

// Planned at every tip: the id is the next one there, and "one open question per phase" holds there.
export function askPlan(intent: AskIntent, see: See = () => {}): RecordPlan {
  return questionPlan(intent.spec, "ask", (plan) => askEdit(plan, intent), see);
}

export function answerPlan(intent: AnswerIntent, see: See = () => {}): RecordPlan {
  return questionPlan(intent.spec, "answer", (plan) => answerEdit(plan, intent), see);
}

function questionPlan(spec: string, action: string, edit: (plan: JoinedPlan) => Planned, see: See): RecordPlan {
  return (view) => {
    const plan = readJoinedPlan(view, spec);
    if (!plan) return { refused: `${spec} is not on the board` };
    const planned = edit(plan);
    if ("refused" in planned) return planned;
    if ("unchanged" in planned) {
      see({ kind: "unchanged", line: planned.unchanged, added: [] });
      return { unchanged: true };
    }
    see({ kind: "changed", line: planned.line, added: [] });
    return { ops: [planned.op], message: `record: ${action} ${spec} ${planned.op.path.split("/").at(-1)?.replace(".json", "")}` };
  };
}

function askEdit(plan: JoinedPlan, intent: AskIntent): Planned {
  const phase = findPhaseDoc(plan, intent.phase);
  if (typeof phase === "string") return { refused: phase };
  if (phase.deployed || allTasksDone(countTasks(phase.tasks))) return { refused: `Phase ${phase.id} is done; nothing to park` };
  const question = oneLine(intent.question);
  const open = openQuestionOn(plan, phase.id);
  if (open?.question === question) return { unchanged: `question: ${open.id} is already open on phase ${phase.id}` };
  if (open) return { refused: `Phase ${phase.id} is already parked on "${open.question}" (${open.id}); ask both in one question` };
  const parked = openRecordPark(phase);
  if (parked) return { refused: `Phase ${phase.id} is already parked on "${parked.question}"; ask both in one question` };
  const gate = nextGateTask(phase);
  const recommend = intent.recommend?.trim() ? oneLine(intent.recommend) : undefined;
  const doc: QuestionDoc = {
    id: nextQuestionId(plan.questions ?? []),
    about: aboutPhase(plan.spec.name, phase.id, gate),
    kind: gate ? "gate" : "question",
    askedAt: intent.at,
    askedBy: intent.by,
    question,
    ...(recommend ? { recommend } : {}),
  };
  const advice = recommend ? ` · recommend: ${recommend}` : "";
  return { op: { op: "create", path: questionDocPath(plan.spec.name, doc.id), doc }, line: `question: ${doc.id} open on phase ${phase.id} — "${question}"${advice}\nHand off; the board shows the question.` };
}

function answerEdit(plan: JoinedPlan, intent: AnswerIntent): Planned {
  const found = targetOf(plan, intent);
  if (typeof found === "string") return { refused: found };
  const { question, phase } = found;
  const text = oneLine(intent.text);
  if (question.answer?.text === text) return { unchanged: `question: ${question.id} is already answered: "${text}"` };
  if (question.answer) return { refused: `${question.id} was answered ${question.answer.at} by ${question.answer.by}: "${question.answer.text}"` };
  const patch = { answer: { text, by: intent.by, at: intent.at } };
  const op: RecordOp = { op: "update", path: questionDocPath(plan.spec.name, question.id), patch, ...(intent.ifVersion ? { ifVersion: intent.ifVersion } : {}) };
  const where = phase ? ` on phase ${phase}` : "";
  return { op, line: `question: ${question.id} answered${where}: "${text}" (${intent.by})` };
}

function targetOf(plan: JoinedPlan, intent: AnswerIntent): { question: QuestionDoc; phase?: string } | string {
  if (intent.id) {
    const question = (plan.questions ?? []).find((doc) => doc.id === intent.id);
    if (!question) return `no question ${intent.id} in ${plan.spec.name}`;
    const phase = plan.phases.find((each) => questionsOn(plan, each.id).includes(question))?.id;
    return phase ? { question, phase } : { question };
  }
  const phase = findPhaseDoc(plan, intent.phase ?? "");
  if (typeof phase === "string") return phase;
  const question = openQuestionOn(plan, phase.id);
  return question ? { question, phase: phase.id } : `Phase ${phase.id} is not parked`;
}

export function nextGateTask(phase: PhaseDoc): string | undefined {
  const next = phase.tasks.find((task) => !task.done);
  return next && (next.gate || isGateItem(next.text)) ? next.id : undefined;
}
