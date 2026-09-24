import { relative, isAbsolute } from "node:path";
import { truncate } from "../context/text";
import type { Lesson } from "./project-ledger";

const SUMMARY_LIMIT = 400;

export function toProjectPath(filePath: string, projectDir: string): string {
  const path = isAbsolute(filePath) ? relative(projectDir, filePath) : filePath;
  return path.replace(/^\.\//, "");
}

export function lessonsForFiles(lessons: readonly Lesson[], projectPaths: readonly string[]): Lesson[] {
  const matching = lessons.filter(
    (lesson) => !lesson.enforcedBy && lesson.paths.some((glob) => projectPaths.some((path) => new Bun.Glob(glob).match(path))),
  );
  return matching.toSorted((a, b) => b.seenIn.length - a.seenIn.length);
}

export function describeLesson(lesson: Lesson): string {
  const seen = lesson.seenIn.length > 0 ? `, seen in ${lesson.seenIn.length} spec${lesson.seenIn.length === 1 ? "" : "s"}` : "";
  const summary = lesson.summary ? ` ${truncate(lesson.summary, SUMMARY_LIMIT)}` : "";
  return `- ${lesson.title} (\`${lesson.name}\`${seen}).${summary}`;
}
