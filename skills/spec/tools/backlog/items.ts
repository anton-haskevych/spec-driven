import { join } from "node:path";
import { markdownFilesIn, readTextIfExists } from "../core/files";
import { parseFrontmatter, stringField, stringList } from "../core/frontmatter";
import { readSchedule, type Priority } from "../core/schedule";

export const BACKLOG_DIR = join("docs", "specs", "_backlog");
export const CLOSED_DIR = "_closed";

export interface BacklogItem {
  file: string;
  slug: string;
  title: string;
  body: string;
  tags: string[];
  priority?: Priority;
  due?: string;
  created?: string;
  resolution?: string;
}

export function loadBacklog(projectDir: string): BacklogItem[] {
  const dir = join(projectDir, BACKLOG_DIR);
  return markdownFilesIn(dir).flatMap((name) => {
    const file = join(dir, name);
    const item = parseBacklogItem(file, name.replace(/\.md$/, ""), readTextIfExists(file) ?? "");
    return item ? [item] : [];
  });
}

export function parseBacklogItem(file: string, slug: string, text: string): BacklogItem | undefined {
  const parsed = parseFrontmatter(text);
  if (parsed.kind !== "ok") return undefined;
  const title = stringField(parsed.data, "title");
  if (!title) return undefined;
  const { priority, due } = readSchedule(parsed.data);
  return {
    file,
    slug,
    title,
    body: parsed.body.trim(),
    tags: stringList(parsed.data, "tags"),
    priority,
    due,
    created: stringField(parsed.data, "created"),
    resolution: stringField(parsed.data, "resolution"),
  };
}
