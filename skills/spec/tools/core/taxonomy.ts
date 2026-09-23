import { join } from "node:path";
import { readTextIfExists } from "./files";
import { outlineMarkdown } from "./markdown";

const PLUGIN_TAXONOMY = join(import.meta.dir, "..", "..", "taxonomy.md");
const PROJECT_TAXONOMY = join(".claude", "taxonomy.md");
const STATUS_SECTION = /^status\b/i;
const VALUE_TOKEN = /^[a-z][a-z-]*$/;

export function allowedStatuses(projectDir: string): string[] {
  const project = statusValues(readTextIfExists(join(projectDir, PROJECT_TAXONOMY)) ?? "");
  if (project.length > 0) return project;
  return statusValues(readTextIfExists(PLUGIN_TAXONOMY) ?? "");
}

export function statusValues(markdown: string): string[] {
  const values = outlineMarkdown(markdown)
    .codeSpans.filter((span) => STATUS_SECTION.test(span.section) && VALUE_TOKEN.test(span.code))
    .map((span) => span.code);
  return [...new Set(values)];
}
