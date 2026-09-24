import { existsSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { readTextIfExists } from "../core/files";
import { isRecord } from "../core/frontmatter";
import { locateSpecFile } from "../core/spec-folders";
import { allowedStatuses } from "../core/taxonomy";
import { formatIssues, type Issue } from "../doctor/issue";
import { checkLedgerEntry } from "../doctor/ledger";
import { checkProjectLesson } from "../doctor/project-lesson";
import { checkSpecMeta } from "../doctor/spec-meta";

const WATCHED_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);

const PROJECT_LESSON = /\/docs\/specs\/_ledger\/(?!INDEX\.md$)[^/]+\.md$/;

export function issuesForWrittenFile(filePath: string, projectDir: string): Issue[] {
  if (PROJECT_LESSON.test(filePath)) {
    const text = readTextIfExists(filePath);
    return text === undefined ? [] : checkProjectLesson(filePath, text);
  }
  const location = locateSpecFile(filePath);
  const text = location ? readTextIfExists(filePath) : undefined;
  if (!location || text === undefined) return [];

  if (location.pathInSpec === "CLAUDE.md") return checkSpecMeta(filePath, text, allowedStatuses(projectDir));
  if (isLedgerEntry(location.pathInSpec)) {
    const ledgerDir = dirname(filePath);
    return checkLedgerEntry(filePath, text, (name) => existsSync(join(ledgerDir, name)));
  }
  return [];
}

function isLedgerEntry(pathInSpec: string): boolean {
  const parts = pathInSpec.split("/");
  return parts.length === 2 && parts[0] === "ledger" && pathInSpec.endsWith(".md") && basename(pathInSpec) !== "INDEX.md";
}

export function hookResponse(payload: unknown, fallbackDir: string): string | undefined {
  if (!isRecord(payload) || !WATCHED_TOOLS.has(String(payload.tool_name))) return undefined;
  const input = payload.tool_input;
  const rawPath = isRecord(input) ? input.file_path : undefined;
  if (typeof rawPath !== "string") return undefined;

  const projectDir = typeof payload.cwd === "string" ? payload.cwd : fallbackDir;
  const filePath = isAbsolute(rawPath) ? rawPath : join(projectDir, rawPath);
  const errors = issuesForWrittenFile(filePath, projectDir).filter((issue) => issue.severity === "error");
  if (errors.length === 0) return undefined;

  const reason = `spec doctor found problems in the file you just wrote:\n${formatIssues(errors, projectDir)}\nFix them before moving on.`;
  return JSON.stringify({ decision: "block", reason });
}

if (import.meta.main) {
  try {
    const raw = await Bun.stdin.text();
    const response = raw.trim() ? hookResponse(JSON.parse(raw), process.cwd()) : undefined;
    if (response) console.log(response);
  } catch {
    // Fail open: a broken check must never interrupt the session.
  }
  process.exit(0);
}
