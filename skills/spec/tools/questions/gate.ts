import { questionDocPath } from "../plan/kinds";
import type { JoinedPlan } from "../plan/state-source";
import type { RecordOp } from "../record/plan-writes";
import { aboutPhase, nextQuestionId, type QuestionAnswer, type QuestionDoc } from "./question-doc";

// A Gate: task's approval is an answered `gate` question about that task.
export function approvalOf(plan: Pick<JoinedPlan, "spec" | "questions">, phase: string, task: string): QuestionDoc | undefined {
  return gateQuestions(plan, phase, task).find((doc) => doc.answer !== undefined);
}

export function approvalEvidence(doc: QuestionDoc): string {
  return doc.answer ? `"${doc.answer.text}" — ${doc.answer.by}, ${doc.answer.at}` : "";
}

// An approval given at the tick: it answers the task's open gate question, or is written as one already
// answered. One already recorded is left alone.
export function approvalOps(plan: Pick<JoinedPlan, "spec" | "questions">, phase: string, task: { id: string; text: string }, answer: QuestionAnswer): RecordOp[] {
  const spec = plan.spec.name;
  const asked = gateQuestions(plan, phase, task.id);
  if (asked.some((doc) => doc.answer !== undefined)) return [];
  const open = asked[0];
  if (open) return [{ op: "update", path: questionDocPath(spec, open.id), patch: { answer } }];
  const doc: QuestionDoc = { id: nextQuestionId(plan.questions ?? []), about: aboutPhase(spec, phase, task.id), kind: "gate", askedAt: answer.at, askedBy: answer.by, question: task.text, answer };
  return [{ op: "create", path: questionDocPath(spec, doc.id), doc }];
}

function gateQuestions(plan: Pick<JoinedPlan, "spec" | "questions">, phase: string, task: string): QuestionDoc[] {
  const about = aboutPhase(plan.spec.name, phase, task);
  return (plan.questions ?? []).filter((doc) => doc.kind === "gate" && doc.about === about);
}
