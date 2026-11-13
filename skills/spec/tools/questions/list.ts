import { specDocPath } from "../plan/kinds";
import type { RecordView } from "../record/view";
import { questionDocPath } from "../plan/kinds";
import type { QuestionDoc } from "./question-doc";
import { readSpecQuestions } from "./read";

export interface QuestionRow extends QuestionDoc {
  spec: string;
  // What `question answer --if-version` passes back: the document as this list read it.
  version: string;
}

const SPEC_DOC = /^specs\/([^/]+)\/spec\.json$/;

// Every joined spec's questions, open ones only unless `all`; specs in name order, questions as asked.
export function questionRows(view: RecordView, all = false): QuestionRow[] {
  const specs = view.paths().flatMap((path) => SPEC_DOC.exec(path)?.[1] ?? []).filter((spec) => view.doc(specDocPath(spec)) !== undefined);
  return specs.flatMap((spec) =>
    readSpecQuestions(view, spec)
      .filter((doc) => all || doc.answer === undefined)
      .map((doc) => ({ ...doc, spec, version: view.version(questionDocPath(spec, doc.id)) ?? "" })),
  );
}

export function questionLine(row: QuestionRow): string {
  const where = row.about.startsWith(`${row.spec}#`) ? `${row.spec} · phase ${row.about.slice(row.spec.length + 1).replace(":", " · task ")}` : `${row.spec} · ${row.about}`;
  const advice = row.recommend ? ` · recommend: ${row.recommend}` : "";
  const gate = row.kind === "gate" ? " (approval)" : "";
  const answered = row.answer ? ` · answered ${row.answer.at} by ${row.answer.by}: "${row.answer.text}"` : "";
  return `${row.id} · ${where}${gate} — "${row.question}"${advice} · asked ${row.askedAt} by ${row.askedBy}${answered}`;
}

export function questionsSummary(rows: readonly QuestionRow[], all: boolean): string {
  const specs = new Set(rows.map((row) => row.spec)).size;
  const open = rows.filter((row) => row.answer === undefined).length;
  const across = `across ${specs} ${specs === 1 ? "spec" : "specs"}`;
  if (rows.length === 0) return all ? "question: none asked on the board" : "question: none open on the board";
  return all ? `question: ${rows.length} asked, ${open} open, ${across}` : `question: ${open} open ${across}`;
}
