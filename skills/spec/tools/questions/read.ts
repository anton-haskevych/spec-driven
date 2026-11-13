import { questionsFolder } from "../plan/kinds";
import type { RecordView } from "../record/view";
import { questionNumber, readQuestionDoc, type QuestionDoc } from "./question-doc";

// A spec's questions in the order they were asked; one that doesn't read is left out.
export function readSpecQuestions(view: RecordView, spec: string): QuestionDoc[] {
  const folder = questionsFolder(spec);
  const docs = view.paths().flatMap((path) => {
    if (!path.startsWith(folder) || path.slice(folder.length).includes("/")) return [];
    const doc = readQuestionDoc(view.doc(path)).doc;
    return doc ? [doc] : [];
  });
  return docs.toSorted((a, b) => questionNumber(a.id) - questionNumber(b.id));
}
