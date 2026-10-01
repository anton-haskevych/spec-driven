import { join } from "node:path";
import { parseArgs } from "node:util";
import { applyEdits } from "../core/apply-edits";
import { readTextIfExists } from "../core/files";
import { resolveSpec } from "../core/spec-folders";
import { planLessonAdd } from "../lessons/add";
import { lessonFileName, loadProjectLessons, PROJECT_LEDGER_DIR } from "../lessons/project-ledger";
import { describeLesson, lessonsForFiles, toProjectPath } from "../lessons/recall";
import { addSeenIn } from "../lessons/seen-in";
import { similarLessons, type ScoredLesson } from "../lessons/similar";
import { describeCandidate, graduationCandidates } from "../lessons/graduation";
import { loadNodes } from "../graph/nodes";

const USAGE =
  'usage: lessons recall <file…> | lessons similar <slug or title words…> | lessons seen <entry.md> <spec-name> | lessons add <entry.md> <spec-name> [--summary "<text>"] | lessons candidates [<spec-name> | <file…>]';
const CLOSE_MATCH = 0.5;

export function lessonsCommand(projectDir: string, args: readonly string[]): string {
  const [action, ...rest] = args;
  switch (action) {
    case "recall":
      return recall(projectDir, rest);
    case "similar":
      return similar(projectDir, rest.join(" "));
    case "seen":
      return seen(projectDir, rest[0], rest[1]);
    case "add":
      return add(projectDir, rest);
    case "candidates":
      return candidates(projectDir, rest);
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
  const file = join(projectDir, PROJECT_LEDGER_DIR, lessonFileName(entry));
  const text = readTextIfExists(file);
  if (text === undefined) return `No project lesson at ${file}.`;

  const result = addSeenIn(text, specName);
  if (result.kind === "invalid") return `Could not update ${entry}: ${result.reason}.`;
  if (result.kind === "unchanged") return `${entry} already lists ${specName}.`;
  applyEdits({ kind: "ok", edits: [{ file, text: result.text }] });
  return `${entry}: added ${specName} to seen-in.`;
}

function add(projectDir: string, args: string[]): string {
  const parsed = parseAddArgs(args);
  const [entry, specName] = parsed?.positionals ?? [];
  if (!parsed || !entry || !specName) return USAGE;
  const spec = resolveSpec(projectDir, specName);
  if (typeof spec === "string") return `lessons add: ${spec}`;

  const result = planLessonAdd(projectDir, spec, { entry, now: new Date(), summary: parsed.values.summary });
  if (result.plan.kind === "invalid") return `lessons add: ${result.plan.reason}`;
  if (result.plan.kind === "unchanged") return result.plan.reason;
  applyEdits(result.plan);
  const name = lessonFileName(entry);
  const recorded = `${name} recorded for ${spec.name}: ${result.changes.join(", ")}`;
  const close = closeMatches(projectDir, name);
  if (close.length === 0) return recorded;
  const lines = close.map(({ lesson, score }) => `${describeLesson(lesson)} [similarity ${score.toFixed(2)}]`);
  return `Similar project lessons. If one says the same thing, fold this lesson into it, remove ${name} and its two INDEX rows, and run lessons add <that entry> ${spec.name} instead:\n${lines.join("\n")}\n${recorded}`;
}

function closeMatches(projectDir: string, name: string): ScoredLesson[] {
  const lessons = loadProjectLessons(projectDir);
  const self = lessons.find((lesson) => lesson.name === name);
  const others = lessons.filter((lesson) => lesson.name !== name);
  return similarLessons(others, `${name} ${self?.title ?? ""}`).filter((scored) => scored.score >= CLOSE_MATCH);
}

function parseAddArgs(args: string[]) {
  try {
    return parseArgs({ args, options: { summary: { type: "string" } }, allowPositionals: true, strict: true });
  } catch {
    return undefined;
  }
}

function candidates(projectDir: string, args: readonly string[]): string {
  const node = args.length === 1 && args[0] ? loadNodes(projectDir).get(args[0]) : undefined;
  const scope = node
    ? { specName: node.spec.name, paths: node.codeMapPaths }
    : args.length > 0 ? { paths: args.map((file) => toProjectPath(file, projectDir)) } : {};
  const found = graduationCandidates(loadProjectLessons(projectDir), scope);
  if (found.length === 0) return "No graduation candidates: no unguarded lesson has hit 3+ specs here.";
  return `Lessons that keep recurring and have no guard. Each is a candidate for a check that makes it impossible (CI job, hook, lint or ArchUnit rule, test helper):\n${found.map(describeCandidate).join("\n")}`;
}
