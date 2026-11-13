import type { JoinedPlan } from "../plan/state-source";
import { aboutOf, type QuestionDoc } from "./question-doc";

// Every question about a phase or one of its tasks, in the order asked.
export function questionsOn(plan: Pick<JoinedPlan, "spec" | "questions">, phaseId: string): QuestionDoc[] {
  return (plan.questions ?? []).filter((doc) => {
    const about = aboutOf(doc.about);
    return about?.spec === plan.spec.name && about.phase === phaseId;
  });
}

export function openQuestionOn(plan: Pick<JoinedPlan, "spec" | "questions">, phaseId: string): QuestionDoc | undefined {
  return questionsOn(plan, phaseId).find((doc) => doc.answer === undefined);
}
