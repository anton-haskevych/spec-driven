import { appendFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isRecord } from "../core/frontmatter";
import { loadProjectLessons } from "../lessons/project-ledger";
import { describeLesson, lessonsForFiles, toProjectPath } from "../lessons/recall";

export interface RecallMemory {
  seen(name: string): boolean;
  remember(names: readonly string[]): void;
}

const WATCHED_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);
const MAX_PER_EDIT = 3;
const SPEC_FILES = /(^|\/)docs\/specs\//;

export function recallResponse(payload: unknown, fallbackDir: string, memory: RecallMemory): string | undefined {
  if (!isRecord(payload) || !WATCHED_TOOLS.has(String(payload.tool_name))) return undefined;
  const input = payload.tool_input;
  const rawPath = isRecord(input) ? input.file_path : undefined;
  if (typeof rawPath !== "string") return undefined;

  const projectDir = typeof payload.cwd === "string" ? payload.cwd : fallbackDir;
  const path = toProjectPath(rawPath, projectDir);
  if (SPEC_FILES.test(path) || path.startsWith("..")) return undefined;

  const fresh = lessonsForFiles(loadProjectLessons(projectDir), [path])
    .filter((lesson) => !memory.seen(lesson.name))
    .slice(0, MAX_PER_EDIT);
  if (fresh.length === 0) return undefined;
  memory.remember(fresh.map((lesson) => lesson.name));

  const additionalContext = `Project lessons for ${path} (docs/specs/_ledger; each shown once per session):\n${fresh.map(describeLesson).join("\n")}`;
  return JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext } });
}

export function sessionMemory(sessionId: string): RecallMemory {
  const file = join(tmpdir(), `spec-driven-recall-${sessionId.replace(/[^\w-]/g, "")}.txt`);
  const shown = new Set(readLines(file));
  return {
    seen: (name) => shown.has(name),
    remember: (names) => appendFileSync(file, names.map((name) => `${name}\n`).join("")),
  };
}

function readLines(file: string): string[] {
  try {
    return readFileSync(file, "utf8").split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

if (import.meta.main) {
  try {
    const raw = await Bun.stdin.text();
    const payload: unknown = raw.trim() ? JSON.parse(raw) : undefined;
    const sessionId = isRecord(payload) && typeof payload.session_id === "string" ? payload.session_id : "unknown";
    const response = recallResponse(payload, process.cwd(), sessionMemory(sessionId));
    if (response) console.log(response);
  } catch {
    // Fail open: recall is a hint, never a reason to stop an edit.
  }
  process.exit(0);
}
