import { parseFrontmatter, stringField } from "../core/frontmatter";
import { parseIndexRows } from "../core/ledger-index";
import { PROJECT_LEDGER_DIR } from "../lessons/project-ledger";
import { error, warning, type Issue } from "./issue";

const REQUIRED_FIELDS = ["kind", "applies-to"];
const NO_SUCCESSOR = new Set(["none", "null", "-"]);

export type EntryExists = (name: string) => boolean;

export function checkLedgerEntry(file: string, text: string, entryExists: EntryExists): Issue[] {
  const parsed = parseFrontmatter(text);
  if (parsed.kind === "none") {
    return [error(file, "ledger entry has no frontmatter (needs kind, applies-to, created)")];
  }
  if (parsed.kind === "invalid") return [error(file, parsed.error)];

  const issues = REQUIRED_FIELDS.filter((key) => parsed.data[key] === undefined).map((key) =>
    error(file, `frontmatter has no ${key}`),
  );
  if (!stringField(parsed.data, "created")) issues.push(warning(file, "frontmatter has no created"));

  const successor = stringField(parsed.data, "superseded-by");
  if (successor && !NO_SUCCESSOR.has(successor) && !entryExists(successor) && !entryExists(`${successor}.md`)) {
    issues.push(error(file, `superseded-by points at ${successor}, which does not exist`));
  }
  return issues;
}

const PROJECT_LESSON_POINTER_PREFIX = `${PROJECT_LEDGER_DIR}/`;

export type RepoPathExists = (repoRelativePath: string) => boolean;

export function checkLedgerIndex(indexFile: string, indexText: string, entryNames: readonly string[], pathExists?: RepoPathExists): Issue[] {
  const counts = new Map<string, number>();
  for (const row of parseIndexRows(indexText)) counts.set(row.file, (counts.get(row.file) ?? 0) + 1);
  const issues: Issue[] = [];
  for (const [file, count] of counts) {
    if (file.includes("/")) {
      if (isProjectLessonPointer(file) && pathExists && !pathExists(file)) issues.push(error(indexFile, `points at ${file}, which does not exist`));
    } else if (!entryNames.includes(file)) {
      issues.push(error(indexFile, `lists ${file}, which does not exist`));
    }
    if (count > 1) issues.push(warning(indexFile, `lists ${file} ${count} times; keep one row`));
  }
  for (const name of entryNames) {
    if (!counts.has(name)) issues.push(warning(indexFile, `has no row for ${name}`));
  }
  return issues;
}

function isProjectLessonPointer(file: string): boolean {
  return file.startsWith(PROJECT_LESSON_POINTER_PREFIX);
}
