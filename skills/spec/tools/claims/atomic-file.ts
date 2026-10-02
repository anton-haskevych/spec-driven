import { existsSync, linkSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LOCK_SUFFIX = ".lock";
const LEFTOVER = /\.json\.(tmp-|lock$)/;
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

// Removal re-reads the file under a per-claim lock. Moving it away first and putting a changed one back
// could delete a claim another session created in between, leaving two sessions sure they won.
// A create never replaces a file, so under the lock the judged text can't change before the removal.
export function removeIfUnchanged(file: string, judgedText: string): boolean {
  const lock = `${file}${LOCK_SUFFIX}`;
  if (!tryLock(lock)) return false;
  try {
    if (readIfPresent(file) !== judgedText) return false;
    rmSync(file);
    return true;
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}

function tryLock(lock: string): boolean {
  try {
    mkdirSync(lock);
    return true;
  } catch (error) {
    if (errorCode(error) === "EEXIST") return false;
    throw error;
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

// A young leftover may belong to a session still mid-take. An old lock is one a crashed session never released.
export function sweepLeftovers(dir: string, now: Date): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (!LEFTOVER.test(name)) continue;
    const path = join(dir, name);
    if (now.getTime() - statSync(path).mtimeMs > LEFTOVER_AGE_MS) rmSync(path, { recursive: true, force: true });
  }
}

export function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined;
}
