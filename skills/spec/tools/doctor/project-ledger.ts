import { existsSync } from "node:fs";
import { join } from "node:path";
import { markdownFilesIn, readTextIfExists } from "../core/files";
import { loadProjectLessons, PROJECT_LEDGER_DIR } from "../lessons/project-ledger";
import { warning, type Issue } from "./issue";
import { checkEnforcedBy, checkProjectLesson } from "./project-lesson";

const RETIRED_INDEX = "INDEX.md";

export function projectLedgerIssues(projectDir: string): Issue[] {
  const dir = join(projectDir, PROJECT_LEDGER_DIR);
  const lessonNames = markdownFilesIn(dir).filter((name) => name !== RETIRED_INDEX);
  const shape = lessonNames.flatMap((name) => checkProjectLesson(join(dir, name), readTextIfExists(join(dir, name)) ?? ""));
  const guards = loadProjectLessons(projectDir).flatMap((lesson) =>
    checkEnforcedBy(lesson.file, lesson.enforcedBy, (path) => existsSync(join(projectDir, path))),
  );
  return [...shape, ...guards, ...retiredIndexIssues(join(dir, RETIRED_INDEX))];
}

function retiredIndexIssues(indexFile: string): Issue[] {
  return existsSync(indexFile) ? [warning(indexFile, "nothing reads or writes this file any more; delete it")] : [];
}
