import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { stateDirIn, type Git } from "../core/git";
import type { Result } from "../core/result";
import { moveIntoPlace, pruneBases } from "../mainline/base-cache";
import { RECORD_LAYOUT } from "./layout";

export interface RecordCopy {
  tip: string;
  dir: string;
  ageMs: number;
}

export const RECORD_COPY_KEEP = 2;
const TEMP_PREFIX = ".tmp-";

export function recordCopyRoot(commonDir: string): string {
  return stateDirIn(commonDir, "record");
}

// Same shape as the base cache: extract aside, rename into place, so a reader never sees half a tip.
export async function refreshRecordCopy(git: Git, commonDir: string, tip: string): Promise<Result<string>> {
  const root = recordCopyRoot(commonDir);
  const dir = join(root, `${tip}.${RECORD_LAYOUT}`);
  if (existsSync(dir)) {
    const now = new Date();
    utimesSync(dir, now, now);
    return { ok: true, value: dir };
  }
  mkdirSync(root, { recursive: true });
  const scratch = mkdtempSync(join(root, TEMP_PREFIX));
  try {
    const tar = join(scratch, "record.tar");
    // -o, never stdout: Runner decodes stdout as text, which corrupts a tar.
    const archived = git.out(["archive", "--format=tar", "-o", tar, tip]);
    if (!archived.ok) return archived;
    const tree = join(scratch, "tree");
    mkdirSync(tree);
    await new Bun.Archive(await Bun.file(tar).bytes()).extract(tree);
    moveIntoPlace(tree, dir);
    pruneBases(root, RECORD_COPY_KEEP);
    return { ok: true, value: dir };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export function readRecordCopy(commonDir: string, now: Date): RecordCopy | undefined {
  const root = recordCopyRoot(commonDir);
  if (!existsSync(root)) return undefined;
  const newest = readdirSync(root)
    .filter((name) => !name.startsWith(TEMP_PREFIX) && name.endsWith(`.${RECORD_LAYOUT}`))
    .map((name) => ({ name, used: statSync(join(root, name)).mtimeMs }))
    .toSorted((a, b) => b.used - a.used)[0];
  if (!newest) return undefined;
  return { tip: newest.name.slice(0, -`.${RECORD_LAYOUT}`.length), dir: join(root, newest.name), ageMs: Math.max(0, now.getTime() - newest.used) };
}
