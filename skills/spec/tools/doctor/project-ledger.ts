import { existsSync } from "node:fs";
import { join } from "node:path";
import { markdownFilesIn, readTextIfExists } from "../core/files";
import { loadProjectLessons, PROJECT_LEDGER_DIR } from "../lessons/project-ledger";
import type { Issue } from "./issue";
import { checkLedgerIndex } from "./ledger";
import { checkEnforcedBy, checkProjectLesson } from "./project-lesson";

const INDEX = "INDEX.md";

export function projectLedgerIssues(projectDir: string): Issue[] {
  const dir = join(projectDir, PROJECT_LEDGER_DIR);
  const lessonNames = markdownFilesIn(dir).filter((name) => name !== INDEX);
  const shape = lessonNames.flatMap((name) => checkProjectLesson(join(dir, name), readTextIfExists(join(dir, name)) ?? ""));
  const guards = loadProjectLessons(projectDir).flatMap((lesson) =>
    checkEnforcedBy(lesson.file, lesson.enforcedBy, (path) => existsSync(join(projectDir, path))),
  );
  const indexFile = join(dir, INDEX);
  const indexText = readTextIfExists(indexFile);
  const index = indexText === undefined ? [] : checkLedgerIndex(indexFile, indexText, lessonNames);
  return [...shape, ...guards, ...index];
}
