import { existsSync, linkSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LEFTOVER = /\.json\.(tmp|stale)-/;
const LEFTOVER_AGE_MS = 60_000;

// link, not open(wx): readers never see a half-written claim.
export function createExclusive(file: string, text: string, sessionId: string): boolean {
  const temp = `${file}.tmp-${sessionId}`;
  writeFileSync(temp, text);
  try {
    linkSync(temp, file);
    return true;
  } catch (error) {
    if (errorCode(error) === "EEXIST") return false;
    throw error;
  } finally {
    rmSync(temp, { force: true });
  }
}

// Between judging and renaming, another session may have replaced the file; that newer file goes back.
export function displaceIfUnchanged(file: string, judgedText: string, sessionId: string): boolean {
  const moved = `${file}.stale-${sessionId}`;
  try {
    renameSync(file, moved);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return false;
    throw error;
  }
  const unchanged = readFileSync(moved, "utf8") === judgedText;
  if (!unchanged) putBack(moved, file);
  rmSync(moved, { force: true });
  return unchanged;
}

function putBack(moved: string, file: string): void {
  try {
    linkSync(moved, file);
  } catch (error) {
    if (errorCode(error) !== "EEXIST") throw error;
  }
}

// Not readTextIfExists: another session can rename the file away between its check and its read.
export function readIfPresent(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") return undefined;
    throw error;
  }
}

// A young leftover may belong to a session still mid-take.
export function sweepLeftovers(dir: string, now: Date): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (!LEFTOVER.test(name)) continue;
    const path = join(dir, name);
    if (now.getTime() - statSync(path).mtimeMs > LEFTOVER_AGE_MS) rmSync(path, { force: true });
  }
}

export function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined;
}
