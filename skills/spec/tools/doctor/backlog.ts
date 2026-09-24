import { join } from "node:path";
import { BACKLOG_DIR, CLOSED_DIR } from "../backlog/items";
import { markdownFilesIn, readTextIfExists } from "../core/files";
import { checkBacklogItem } from "./backlog-item";
import type { Issue } from "./issue";

export function backlogIssues(projectDir: string): Issue[] {
  const openDir = join(projectDir, BACKLOG_DIR);
  const closedDir = join(openDir, CLOSED_DIR);
  return [...checkFolder(openDir, false), ...checkFolder(closedDir, true)];
}

function checkFolder(dir: string, closed: boolean): Issue[] {
  return markdownFilesIn(dir).flatMap((name) => {
    const file = join(dir, name);
    return checkBacklogItem(file, readTextIfExists(file) ?? "", closed);
  });
}
