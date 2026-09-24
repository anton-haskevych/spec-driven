import { join } from "node:path";
import { markdownFilesIn, readTextIfExists } from "../core/files";
import { isRecord, parseFrontmatter, stringList, type FrontmatterData } from "../core/frontmatter";

export const PLAYBOOK_DIR = join("docs", "specs", "_playbook");

export interface Playbook {
  name: string;
  file: string;
  match: Record<string, string[]>;
  body: string;
}

export function loadPlaybooks(projectDir: string): Playbook[] {
  const dir = join(projectDir, PLAYBOOK_DIR);
  return markdownFilesIn(dir).flatMap((fileName) => {
    const file = join(dir, fileName);
    const playbook = parsePlaybook(file, fileName.replace(/\.md$/, ""), readTextIfExists(file) ?? "");
    return playbook ? [playbook] : [];
  });
}

export function parsePlaybook(file: string, name: string, text: string): Playbook | undefined {
  const parsed = parseFrontmatter(text);
  const rawMatch = parsed.kind === "ok" ? parsed.data.match : undefined;
  if (parsed.kind !== "ok" || !isRecord(rawMatch)) return undefined;
  const match = Object.fromEntries(Object.keys(rawMatch).map((field) => [field, stringList(rawMatch, field)]));
  return { name, file, match, body: parsed.body.trim() };
}

export function playbookMatches(playbook: Playbook, specData: FrontmatterData): boolean {
  const fields = Object.entries(playbook.match);
  return fields.length > 0 && fields.every(([field, wanted]) => {
    const values = new Set(stringList(specData, field).map((value) => value.toLowerCase()));
    return wanted.some((value) => values.has(value.toLowerCase()));
  });
}

export function selectPlaybooks(playbooks: readonly Playbook[], specData: FrontmatterData, phasePlaybook?: string): Playbook[] {
  return playbooks.filter((playbook) => playbook.name === phasePlaybook || playbookMatches(playbook, specData));
}
