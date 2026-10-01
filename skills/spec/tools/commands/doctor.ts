import { findSpecs, listSpecs } from "../core/spec-folders";
import { isoDay } from "../core/schedule";
import { allowedStatuses } from "../core/taxonomy";
import { backlogIssues } from "../doctor/backlog";
import { playbookIssues } from "../doctor/playbooks";
import { loadPlaybooks } from "../playbook/playbooks";
import { formatIssues, type Issue } from "../doctor/issue";
import { projectLedgerIssues } from "../doctor/project-ledger";
import { runDoctor } from "../doctor/run";
import { gitattributesIssues } from "../doctor/gitattributes";
import { settingsFileIssues } from "../doctor/settings";
import { systemRunner, type Runner } from "../core/run";
import { loadSettings } from "../playbook/settings";
import { loadNodes } from "../graph/nodes";
import { loadGates } from "../playbook/gates";

export function doctorReport(projectDir: string, specName?: string, runner: Runner = systemRunner): string {
  const specs = specName ? findSpecs(projectDir, specName) : listSpecs(projectDir);
  if (specName && specs.length === 0) {
    return `doctor: no spec named ${specName} under docs/specs/ or */docs/specs/`;
  }

  const statuses = allowedStatuses(projectDir);
  const nodes = loadNodes(projectDir);
  const gates = loadGates(projectDir);
  const playbooks = new Set(loadPlaybooks(projectDir).map((playbook) => playbook.name));
  const context = { statuses, nodes, gates, today: isoDay(new Date()), playbooks };
  const specIssues = specs.flatMap((spec) => runDoctor(spec, context));
  const repo = repoIssues(projectDir, gates, runner);
  const projectIssues = [...projectLedgerIssues(projectDir), ...backlogIssues(projectDir), ...playbookIssues(projectDir)];
  const issues = specName ? [...specIssues, ...repo] : [...projectIssues, ...repo, ...specIssues];
  if (issues.length === 0) return `doctor: clean (${specs.length} spec${specs.length === 1 ? "" : "s"})`;

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const summary = `doctor: ${errors} errors, ${issues.length - errors} warnings`;
  return `${summary}\n${formatIssues(issues, projectDir)}`;
}

function repoIssues(projectDir: string, gates: ReadonlyMap<string, string[]> | undefined, runner: Runner): Issue[] {
  if (!loadSettings(projectDir).file) return [];
  return [...settingsFileIssues(projectDir, gates), ...gitattributesIssues(projectDir, runner)];
}
