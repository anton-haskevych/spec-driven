import { join } from "node:path";
import { readThroughEdits, type FileEdit } from "../core/apply-edits";
import { parsePhaseLines } from "../core/progress";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, specStateFrom, type ReadSpecFile } from "../core/spec-state";
import type { Issue } from "../doctor/issue";
import type { SpecNode } from "../graph/nodes";
import { phaseEdgeIssues } from "../doctor/phase-edges";
import { checkPhases } from "../doctor/phases";
import { taskPhaseIssues } from "../doctor/task-phases";

type Nodes = ReadonlyMap<string, SpecNode>;

export function issuesIntroducedBy(spec: SpecFolder, edits: readonly FileEdit[], nodes: Nodes = new Map()): Issue[] {
  const before = new Set(phaseIssues(spec, diskReader(spec.dir), nodes).map(issueKey));
  return phaseIssues(spec, readThroughEdits(spec.dir, edits), nodes).filter((issue) => !before.has(issueKey(issue)));
}

function phaseIssues(spec: SpecFolder, read: ReadSpecFile, nodes: Nodes): Issue[] {
  const lines = parsePhaseLines(read("progress.md") ?? "");
  const state = specStateFrom(spec, read);
  return [
    ...checkPhases(join(spec.dir, "progress.md"), lines, read),
    ...taskPhaseIssues(state),
    ...phaseEdgeIssues(state, nodes),
  ];
}

function issueKey(issue: Issue): string {
  return `${issue.severity} ${issue.file} ${issue.problem}`;
}
