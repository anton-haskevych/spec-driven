import { relative } from "node:path";

export type Severity = "error" | "warning";

export interface Issue {
  file: string;
  severity: Severity;
  problem: string;
}

export function error(file: string, problem: string): Issue {
  return { file, severity: "error", problem };
}

export function warning(file: string, problem: string): Issue {
  return { file, severity: "warning", problem };
}

export function formatIssues(issues: readonly Issue[], projectDir: string): string {
  return issues
    .map((issue) => `${issue.severity}  ${relative(projectDir, issue.file)}: ${issue.problem}`)
    .join("\n");
}
