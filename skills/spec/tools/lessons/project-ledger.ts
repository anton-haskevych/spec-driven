import { join } from "node:path";
import { markdownFilesIn, readTextIfExists } from "../core/files";
import { parseFrontmatter, stringField, type FrontmatterData } from "../core/frontmatter";
import { outlineMarkdown } from "../core/markdown";

export const PROJECT_LEDGER_DIR = join("docs", "specs", "_ledger");
const INDEX = "INDEX.md";
const TITLE = /^#\s+(.+)$/m;

export interface Lesson {
  file: string;
  name: string;
  kind: string;
  title: string;
  summary: string;
  paths: string[];
  seenIn: string[];
  enforcedBy?: string;
}

export function loadProjectLessons(projectDir: string): Lesson[] {
  const dir = join(projectDir, PROJECT_LEDGER_DIR);
  return markdownFilesIn(dir)
    .filter((name) => name !== INDEX)
    .flatMap((name) => {
      const file = join(dir, name);
      const lesson = parseLesson(file, name, readTextIfExists(file) ?? "");
      return lesson ? [lesson] : [];
    });
}

export function parseLesson(file: string, name: string, text: string): Lesson | undefined {
  const parsed = parseFrontmatter(text);
  if (parsed.kind !== "ok") return undefined;
  const firstParagraph = outlineMarkdown(parsed.body).paragraphs[0]?.text ?? "";
  return {
    file,
    name,
    kind: stringField(parsed.data, "kind") ?? "note",
    title: TITLE.exec(parsed.body)?.[1]?.trim() ?? name.replace(/\.md$/, ""),
    summary: firstParagraph,
    paths: stringList(parsed.data, "paths"),
    seenIn: stringList(parsed.data, "seen-in"),
    enforcedBy: stringField(parsed.data, "enforced-by"),
  };
}

export function stringList(data: FrontmatterData, key: string): string[] {
  const value = data[key];
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "").map((item) => item.trim());
}
