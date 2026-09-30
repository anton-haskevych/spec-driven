import { join } from "node:path";
import { readThroughEdits, type FileEdit } from "../core/apply-edits";
import { parsePhaseLines } from "../core/progress";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, specStateFrom, type ReadSpecFile } from "../core/spec-state";
import type { Issue } from "../doctor/issue";
import { checkPhases } from "../doctor/phases";
import { taskPhaseIssues } from "../doctor/task-phases";

export function issuesIntroducedBy(spec: SpecFolder, edits: readonly FileEdit[]): Issue[] {
  const before = new Set(phaseIssues(spec, diskReader(spec.dir)).map(issueKey));
  return phaseIssues(spec, readThroughEdits(spec.dir, edits)).filter((issue) => !before.has(issueKey(issue)));
}

function phaseIssues(spec: SpecFolder, read: ReadSpecFile): Issue[] {
  const lines = parsePhaseLines(read("progress.md") ?? "");
  return [...checkPhases(join(spec.dir, "progress.md"), lines, read), ...taskPhaseIssues(specStateFrom(spec, read))];
}

function issueKey(issue: Issue): string {
  return `${issue.severity} ${issue.file} ${issue.problem}`;
}
