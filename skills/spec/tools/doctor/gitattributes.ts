import { join } from "node:path";
import { systemRunner, type Runner } from "../core/run";
import { warning, type Issue } from "./issue";

export const UNION_RULES = ["docs/specs/**/INDEX.md merge=union", "*/docs/specs/**/INDEX.md merge=union"];
const PROBES = ["docs/specs/_probe/ledger/INDEX.md", "_probe/docs/specs/_probe/ledger/INDEX.md"];
const UNION = /: merge: union$/;

export function gitattributesIssues(projectDir: string, runner: Runner = systemRunner): Issue[] {
  const result = runner.run(["git", "check-attr", "merge", "--", ...PROBES], { cwd: projectDir });
  if (result.code !== 0) return [];
  const lines = result.stdout.trim().split("\n");
  const missing = UNION_RULES.filter((_, index) => !UNION.test(lines[index]?.trim() ?? ""));
  if (missing.length === 0) return [];
  const problem = `spec INDEX.md files don't merge with union, so parallel branches conflict on them; add: ${missing.join(", ")}`;
  return [warning(join(projectDir, ".gitattributes"), problem)];
}
