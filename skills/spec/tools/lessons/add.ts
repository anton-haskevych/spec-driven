import { join } from "node:path";
import type { EditPlan, FileEdit } from "../core/apply-edits";
import { markdownFilesIn, readTextIfExists } from "../core/files";
import { parseFrontmatter } from "../core/frontmatter";
import { setFrontmatterLine } from "../core/frontmatter-patch";
import { formatPointerRow, formatProjectRow, insertRow, kindSection, parseIndexRows } from "../core/ledger-index";
import { isoTimestamp } from "../core/schedule";
import type { SpecFolder } from "../core/spec-folders";
import { newIssues, type Issue } from "../doctor/issue";
import { checkLedgerIndex } from "../doctor/ledger";
import { checkProjectLesson } from "../doctor/project-lesson";
import { lessonFileName, parseLesson, PROJECT_LEDGER_DIR } from "./project-ledger";
import { addSeenIn } from "./seen-in";

export interface LessonAddRequest {
  entry: string;
  now: Date;
  summary?: string;
}

export interface LessonAddResult {
  plan: EditPlan;
  changes: string[];
}

interface LedgerFiles {
  entry: string;
  projectIndex: string;
  specIndex: string;
}

const INDEX = "INDEX.md";
const PROJECT_INDEX_HEADER = "# Project Ledger Index\n";
const SUMMARY_LIMIT = 80;

export function planLessonAdd(projectDir: string, spec: SpecFolder, request: LessonAddRequest): LessonAddResult {
  const name = lessonFileName(request.entry);
  const lessonPath = join(PROJECT_LEDGER_DIR, name);
  const files: LedgerFiles = {
    entry: join(projectDir, lessonPath),
    projectIndex: join(projectDir, PROJECT_LEDGER_DIR, INDEX),
    specIndex: join(spec.dir, "ledger", INDEX),
  };
  const entryText = readTextIfExists(files.entry);
  if (entryText === undefined) return refuse(`no lesson at ${lessonPath}; write it with the Write tool first`);
  const lesson = parseLesson(files.entry, name, entryText);
  if (!lesson) return refuse(`${lessonPath} has no valid frontmatter`);
  const summary = request.summary?.trim() || lesson.title;
  if (summary.length > SUMMARY_LIMIT) return refuse(`the title is ${summary.length} characters; pass --summary "<under 80 characters>"`);
  const specIndex = readTextIfExists(files.specIndex);
  if (specIndex === undefined) return refuse(`${spec.name} has no ledger/INDEX.md`);
  const stamped = stampEntry(entryText, spec.name, request.now);
  if (stamped.kind === "invalid") return refuse(`${lessonPath}: ${stamped.reason}`);

  const before: LedgerFiles = { entry: entryText, projectIndex: readTextIfExists(files.projectIndex) ?? PROJECT_INDEX_HEADER, specIndex };
  const after: LedgerFiles = {
    entry: stamped.text,
    projectIndex: withRow(before.projectIndex, name, formatProjectRow(name, lesson.paths, summary)),
    specIndex: withRow(specIndex, lessonPath, formatPointerRow(lessonPath, summary), kindSection(lesson.kind)),
  };
  const changes = [
    ...stamped.changes,
    ...(after.projectIndex === before.projectIndex ? [] : ["project INDEX row"]),
    ...(after.specIndex === before.specIndex ? [] : [`${spec.name} pointer row`]),
  ];
  if (changes.length === 0) return { plan: { kind: "unchanged", reason: `${name} is already recorded for ${spec.name}` }, changes };

  const introduced = newIssues(ledgerIssues(files, before, projectDir, spec), ledgerIssues(files, after, projectDir, spec));
  if (introduced.length > 0) return refuse(introduced.map((issue) => issue.problem).join("; "));
  return { plan: { kind: "ok", edits: changedFiles(files, before, after) }, changes };
}

type Stamped = { kind: "ok"; text: string; changes: string[] } | { kind: "invalid"; reason: string };

function stampEntry(text: string, specName: string, now: Date): Stamped {
  const parsed = parseFrontmatter(text);
  const hasCreated = parsed.kind === "ok" && parsed.data.created !== undefined;
  const created = hasCreated ? { kind: "ok" as const, text } : setFrontmatterLine(text, "created", isoTimestamp(now));
  if (created.kind === "invalid") return created;
  const seenIn = addSeenIn(created.text, specName);
  if (seenIn.kind === "invalid") return seenIn;
  const changes = [...(hasCreated ? [] : ["created"]), ...(seenIn.kind === "updated" ? ["seen-in"] : [])];
  return { kind: "ok", text: seenIn.kind === "updated" ? seenIn.text : created.text, changes };
}

function withRow(index: string, file: string, row: string, section?: string): string {
  return parseIndexRows(index).some((existing) => existing.file === file) ? index : insertRow(index, row, section);
}

function ledgerIssues(files: LedgerFiles, texts: LedgerFiles, projectDir: string, spec: SpecFolder): Issue[] {
  const lessons = markdownFilesIn(join(projectDir, PROJECT_LEDGER_DIR)).filter((name) => name !== INDEX);
  const specEntries = markdownFilesIn(join(spec.dir, "ledger")).filter((name) => name !== INDEX);
  return [
    ...checkProjectLesson(files.entry, texts.entry),
    ...checkLedgerIndex(files.projectIndex, texts.projectIndex, lessons),
    ...checkLedgerIndex(files.specIndex, texts.specIndex, specEntries),
  ];
}

function changedFiles(files: LedgerFiles, before: LedgerFiles, after: LedgerFiles): FileEdit[] {
  const keys = ["entry", "projectIndex", "specIndex"] as const;
  return keys.filter((key) => after[key] !== before[key]).map((key) => ({ file: files[key], text: after[key] }));
}

function refuse(reason: string): LessonAddResult {
  return { plan: { kind: "invalid", reason }, changes: [] };
}
