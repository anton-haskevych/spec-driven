import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { loadProjectLessons, PROJECT_LEDGER_DIR } from "../lessons/project-ledger";
import { describeLesson, lessonsForFiles, toProjectPath } from "../lessons/recall";
import { addSeenIn } from "../lessons/seen-in";
import { similarLessons } from "../lessons/similar";

const USAGE = "usage: lessons recall <file…> | lessons similar <slug or title words…> | lessons seen <entry.md> <spec-name>";

export function lessonsCommand(projectDir: string, args: readonly string[]): string {
  const [action, ...rest] = args;
  switch (action) {
    case "recall":
      return recall(projectDir, rest);
    case "similar":
      return similar(projectDir, rest.join(" "));
    case "seen":
      return seen(projectDir, rest[0], rest[1]);
    default:
      return USAGE;
  }
}

function recall(projectDir: string, files: readonly string[]): string {
  const paths = files.map((file) => toProjectPath(file, projectDir));
  const matches = lessonsForFiles(loadProjectLessons(projectDir), paths);
  return matches.length > 0 ? matches.map(describeLesson).join("\n") : "No project lessons match these files.";
}

function similar(projectDir: string, query: string): string {
  if (!query.trim()) return USAGE;
  const scored = similarLessons(loadProjectLessons(projectDir), query);
  if (scored.length === 0) return "No similar project lessons. If this lesson is about the codebase, promote it.";
  const lines = scored.map(({ lesson, score }) => `${describeLesson(lesson)} [similarity ${score.toFixed(2)}]`);
  return `Closest project lessons. If one says the same thing, record this spec in its seen-in instead of writing a new entry:\n${lines.join("\n")}`;
}

function seen(projectDir: string, entry: string | undefined, specName: string | undefined): string {
  if (!entry || !specName) return USAGE;
  const file = join(projectDir, PROJECT_LEDGER_DIR, entry.endsWith(".md") ? entry : `${entry}.md`);
  const text = readTextIfExists(file);
  if (text === undefined) return `No project lesson at ${file}.`;

  const result = addSeenIn(text, specName);
  if (result.kind === "invalid") return `Could not update ${entry}: ${result.reason}.`;
  if (result.kind === "unchanged") return `${entry} already lists ${specName}.`;
  writeFileSync(file, result.text);
  return `${entry}: added ${specName} to seen-in.`;
}
