import { parseFrontmatter, stringField } from "../core/frontmatter";
import { error, warning, type Issue } from "./issue";

const REQUIRED_FIELDS = ["kind", "applies-to"];
const INDEX_ROW_FILE = /^\s*[-*]\s+`([^`/]+\.md)`/gm;
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

export function checkLedgerIndex(indexFile: string, indexText: string, entryNames: readonly string[]): Issue[] {
  const listed = new Set([...indexText.matchAll(INDEX_ROW_FILE)].map((match) => match[1] ?? ""));
  const issues: Issue[] = [];
  for (const name of listed) {
    if (!entryNames.includes(name)) issues.push(error(indexFile, `lists ${name}, which does not exist`));
  }
  for (const name of entryNames) {
    if (!listed.has(name)) issues.push(warning(indexFile, `has no row for ${name}`));
  }
  return issues;
}
