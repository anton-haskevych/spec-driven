import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { parsePhaseLines } from "../core/progress";
import type { SpecFolder } from "../core/spec-folders";
import { readPhaseDoc } from "../plan/docs/phase-doc";
import { readSpecDoc } from "../plan/docs/spec-doc";
import { isCheckboxLine, linesOutsideFences } from "../plan/deliverables";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import type { RecordView } from "../record/view";
import { error, warning, type Issue } from "./issue";

// A joined spec's plan is its record documents; the files keep only prose once tidy has run.
export function joinedSpecIssues(spec: SpecFolder, view: RecordView): Issue[] {
  const progressFile = join(spec.dir, "progress.md");
  const specDoc = readSpecDoc(view.doc(specDocPath(spec.name))).doc;
  if (!specDoc) return [];
  const tidied = parsePhaseLines(readTextIfExists(progressFile) ?? "").length === 0;
  return specDoc.phases.flatMap((id) => {
    const path = phaseDocPath(spec.name, id);
    const read = readPhaseDoc(view.doc(path));
    if (!read.doc) return read.problems.map((problem) => error(progressFile, `on the board, ${path}: ${problem}`));
    const file = join(spec.dir, read.doc.file);
    const prose = readTextIfExists(file);
    if (prose === undefined) return [warning(file, `phase ${id} is on the board but its prose file is not in this tree; merge the default branch`)];
    return tidied && hasCheckboxes(prose) ? [warning(file, `still has checkboxes, but ${spec.name}'s tasks live on the board; run join ${spec.name} --tidy (it waits while other work holds the file)`)] : [];
  });
}

function hasCheckboxes(text: string): boolean {
  const lines = text.split("\n");
  return linesOutsideFences(lines).some((index) => isCheckboxLine(lines[index] ?? ""));
}
