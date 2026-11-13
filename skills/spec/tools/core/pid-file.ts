import { readFileSync } from "node:fs";

// A file's trimmed text; absent when it is missing, unreadable or empty.
export function readText(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}

// EPERM: the process exists but belongs to someone else. A pid can be reused, so callers that can also ask the
// process itself (a health route) should.
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (cause) {
    return cause instanceof Error && "code" in cause && cause.code === "EPERM";
  }
}

// The pid a pid file names, when that process is still running.
export function livePid(path: string): number | undefined {
  const pid = Number(readText(path));
  return Number.isInteger(pid) && pid > 0 && isAlive(pid) ? pid : undefined;
}
