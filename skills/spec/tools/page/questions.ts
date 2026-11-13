import { aboutOf } from "../questions/question-doc";
import type { QuestionRow } from "../questions/list";
import type { PageQuestion } from "./model";

export function pageQuestions(rows: readonly QuestionRow[]): PageQuestion[] {
  return rows.map((row) => {
    const phase = aboutOf(row.about)?.phase;
    return {
      id: row.id,
      spec: row.spec,
      about: row.about,
      ...(phase ? { phase } : {}),
      question: row.question,
      ...(row.recommend ? { recommend: row.recommend } : {}),
      askedAt: row.askedAt,
      version: row.version,
    };
  });
}
