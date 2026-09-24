import { existsSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { readTextIfExists } from "../core/files";
import { isRecord } from "../core/frontmatter";
import { locateSpecFile, type SpecFileLocation } from "../core/spec-folders";
import { allowedStatuses } from "../core/taxonomy";
import { formatIssues, type Issue } from "../doctor/issue";
import { checkBacklogItem } from "../doctor/backlog-item";
import { checkLedgerEntry } from "../doctor/ledger";
import { checkProjectLesson } from "../doctor/project-lesson";
import { checkSpecMeta } from "../doctor/spec-meta";
import { linkIssues } from "../graph/checks";
import { loadNodes } from "../graph/nodes";
import { loadSpecState } from "../core/spec-state";
import { phaseEdgeIssues } from "../doctor/phase-edges";
import { phaseScheduleIssues } from "../doctor/schedule";
import { taskPhaseIssues } from "../doctor/task-phases";
import { checkPlaybook, phasePlaybookIssues } from "../doctor/playbooks";
import { loadPlaybooks } from "../playbook/playbooks";
import { projectFieldValues } from "../core/taxonomy";
import { isoDay } from "../core/schedule";

const WATCHED_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);

const PROJECT_LESSON = /\/docs\/specs\/_ledger\/(?!INDEX\.md$)[^/]+\.md$/;
const BACKLOG_ITEM = /\/docs\/specs\/_backlog\/(_closed\/)?[^/]+\.md$/;
const PLAYBOOK = /\/docs\/specs\/_playbook\/[^/]+\.md$/;
const PROJECT_FILES = [PROJECT_LESSON, BACKLOG_ITEM, PLAYBOOK];

export function issuesForWrittenFile(filePath: string, projectDir: string): Issue[] {
  const location = locateSpecFile(filePath);
  const projectFile = PROJECT_FILES.some((pattern) => pattern.test(filePath));
  const text = location || projectFile ? readTextIfExists(filePath) : undefined;
  if (text === undefined) return [];
  if (projectFile) return projectFileIssues(filePath, text, projectDir);
  return location ? specFileIssues(location, filePath, text, projectDir) : [];
}

function projectFileIssues(filePath: string, text: string, projectDir: string): Issue[] {
  if (PROJECT_LESSON.test(filePath)) return checkProjectLesson(filePath, text);
  if (PLAYBOOK.test(filePath)) return checkPlaybook(filePath, text, (field) => projectFieldValues(projectDir, field));
  const backlog = BACKLOG_ITEM.exec(filePath);
  return backlog ? checkBacklogItem(filePath, text, backlog[1] !== undefined) : [];
}

function specFileIssues(location: SpecFileLocation, filePath: string, text: string, projectDir: string): Issue[] {
  if (location.pathInSpec === "CLAUDE.md") {
    const links = linkIssues(loadNodes(projectDir), location.spec.name, filePath);
    return [...checkSpecMeta(filePath, text, allowedStatuses(projectDir)), ...links];
  }
  if (location.pathInSpec.startsWith("phases/")) return phaseFileIssues(location, projectDir);
  if (isLedgerEntry(location.pathInSpec)) {
    const ledgerDir = dirname(filePath);
    return checkLedgerEntry(filePath, text, (name) => existsSync(join(ledgerDir, name)));
  }
  return [];
}

function phaseFileIssues(location: SpecFileLocation, projectDir: string): Issue[] {
  const state = loadSpecState(location.spec);
  const pointer = location.pathInSpec;
  const playbooks = new Set(loadPlaybooks(projectDir).map((playbook) => playbook.name));
  return [
    ...phaseEdgeIssues(state, loadNodes(projectDir), pointer),
    ...phaseScheduleIssues(state, isoDay(new Date()), pointer),
    ...taskPhaseIssues(state, pointer),
    ...phasePlaybookIssues(state, playbooks, pointer),
  ];
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
