import { findSpecs, listSpecs } from "../core/spec-folders";
import { allowedStatuses } from "../core/taxonomy";
import { formatIssues } from "../doctor/issue";
import { runDoctor } from "../doctor/run";
import { loadNodes } from "../graph/nodes";

export function doctorReport(projectDir: string, specName?: string): string {
  const specs = specName ? findSpecs(projectDir, specName) : listSpecs(projectDir);
  if (specName && specs.length === 0) {
    return `doctor: no spec named ${specName} under docs/specs/ or */docs/specs/`;
  }

  const statuses = allowedStatuses(projectDir);
  const nodes = loadNodes(projectDir);
  const issues = specs.flatMap((spec) => runDoctor(spec, { statuses, nodes }));
  if (issues.length === 0) return `doctor: clean (${specs.length} spec${specs.length === 1 ? "" : "s"})`;

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const summary = `doctor: ${errors} errors, ${issues.length - errors} warnings`;
  return `${summary}\n${formatIssues(issues, projectDir)}`;
}
