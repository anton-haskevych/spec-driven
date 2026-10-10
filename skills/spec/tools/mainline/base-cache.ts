import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { stateDirIn, type Git } from "../core/git";
import type { Result } from "../core/result";

export const READ_SET = ["docs/specs/*/*.md", "docs/specs/*/phases/**/*.md", "*/docs/specs/*/*.md", "*/docs/specs/*/phases/**/*.md"];
export const BASE_CACHE_KEEP = 2;
const TEMP_PREFIX = ".tmp-";

export async function baseCache(git: Git, sha: string, commonDir: string): Promise<Result<string>> {
  const root = stateDirIn(commonDir, "base");
  const dir = join(root, sha);
  if (existsSync(dir)) {
    markUsed(dir);
    return { ok: true, value: dir };
  }
  mkdirSync(root, { recursive: true });
  const scratch = mkdtempSync(join(root, TEMP_PREFIX));
  try {
    const extracted = await extractReadSet(git, sha, scratch);
    if (!extracted.ok) return extracted;
    moveIntoPlace(extracted.value, dir);
    pruneBases(root, BASE_CACHE_KEEP);
    return { ok: true, value: dir };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export function matchingPatterns(paths: readonly string[]): string[] {
  return READ_SET.filter((pattern) => {
    const glob = new Bun.Glob(pattern);
    return paths.some((path) => glob.match(path));
  });
}

async function extractReadSet(git: Git, sha: string, scratch: string): Promise<Result<string>> {
  const tree = join(scratch, "tree");
  mkdirSync(tree);
  const listed = git.run(["ls-tree", "-r", "--name-only", "-z", sha]);
  if (listed.code !== 0) return { ok: false, reason: `git ls-tree failed: ${listed.stderr.trim() || `exit ${listed.code}`}` };
  const patterns = matchingPatterns(listed.stdout.split("\0"));
  if (patterns.length === 0) return { ok: true, value: tree };

  const tar = join(scratch, "base.tar");
  // -o, never stdout: Runner decodes stdout as text, which corrupts a tar.
  const archived = git.out(["archive", "--format=tar", "-o", tar, sha, "--", ...patterns.map((pattern) => `:(glob)${pattern}`)]);
  if (!archived.ok) return archived;
  await new Bun.Archive(await Bun.file(tar).bytes()).extract(tree);
  return { ok: true, value: tree };
}

// Another run may have extracted the same sha first; its rename wins and this copy is dropped.
export function moveIntoPlace(from: string, to: string): void {
  try {
    renameSync(from, to);
  } catch (cause) {
    if (!existsSync(to)) throw cause;
    rmSync(from, { recursive: true, force: true });
  }
}

export function pruneBases(root: string, keep: number): void {
  const bases = readdirSync(root)
    .filter((name) => !name.startsWith(TEMP_PREFIX))
    .map((name) => ({ path: join(root, name), used: statSync(join(root, name)).mtimeMs }))
    .toSorted((a, b) => b.used - a.used);
  for (const stale of bases.slice(keep)) rmSync(stale.path, { recursive: true, force: true });
}

function markUsed(dir: string): void {
  const now = new Date();
  utimesSync(dir, now, now);
}
