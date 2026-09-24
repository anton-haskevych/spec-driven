import { existsSync } from "node:fs";
import { join } from "node:path";
import { markdownFilesIn, readTextIfExists } from "../core/files";
import { loadProjectLessons, PROJECT_LEDGER_DIR } from "../lessons/project-ledger";
import type { Issue } from "./issue";
import { checkEnforcedBy, checkProjectLesson } from "./project-lesson";

const INDEX = "INDEX.md";

export function projectLedgerIssues(projectDir: string): Issue[] {
  const dir = join(projectDir, PROJECT_LEDGER_DIR);
  const shape = markdownFilesIn(dir)
    .filter((name) => name !== INDEX)
    .flatMap((name) => checkProjectLesson(join(dir, name), readTextIfExists(join(dir, name)) ?? ""));
  const guards = loadProjectLessons(projectDir).flatMap((lesson) =>
    checkEnforcedBy(lesson.file, lesson.enforcedBy, (path) => existsSync(join(projectDir, path))),
  );
  return [...shape, ...guards];
}
