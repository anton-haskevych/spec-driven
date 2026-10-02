import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readTextIfExists } from "../core/files";
import { parseFrontmatter, recordField, stringField } from "../core/frontmatter";
import type { Result } from "../core/result";
import type { Workspace } from "../workspaces/list";

export interface TreeRootDefaults {
  defaultRoot: string;
  home: string;
}

export interface TreeRoot {
  root: string;
  // Set when the root was just detected: the session prints it once.
  notice?: string;
}

const CHANGE_HINT = 'say "put my trees in X" to change';

// Inside the git common dir: per clone and per device, never committed, no .gitignore line.
export function localSettingsFile(commonDir: string): string {
  return join(commonDir, "spec-driven", "local.md");
}

export function treeRoot(commonDir: string, worktrees: readonly Workspace[], defaults: TreeRootDefaults): Result<TreeRoot> {
  const file = localSettingsFile(commonDir);
  const text = readTextIfExists(file);
  const recorded = text === undefined ? undefined : recordedRoot(text, defaults.home);
  if (recorded) return { ok: true, value: { root: recorded } };

  const detected = detectTreeRoot(worktrees, defaults.defaultRoot);
  const source = detected.trees === 0 ? "default, no trees yet" : `detected from ${detected.trees} ${detected.trees === 1 ? "tree" : "trees"}`;
  if (text !== undefined) return { ok: true, value: { root: detected.root, notice: `Trees: ${detected.root} (${source}; ${file} has no worktrees.root)` } };
  const written = writeRoot(file, detected.root);
  if (!written.ok) return written;
  return { ok: true, value: { root: detected.root, notice: `Trees: ${detected.root} (${source}; ${CHANGE_HINT})` } };
}

// The parent folder holding the most of this person's trees is where they keep them.
export function detectTreeRoot(worktrees: readonly Workspace[], defaultRoot: string): { root: string; trees: number } {
  const counts = new Map<string, number>();
  for (const worktree of worktrees) {
    if (worktree.isMain || worktree.prunable) continue;
    const parent = dirname(worktree.path);
    counts.set(parent, (counts.get(parent) ?? 0) + 1);
  }
  const [best] = [...counts].toSorted(([pathA, a], [pathB, b]) => b - a || pathA.localeCompare(pathB));
  return best ? { root: best[0], trees: best[1] } : { root: defaultRoot, trees: 0 };
}

function recordedRoot(text: string, home: string): string | undefined {
  const parsed = parseFrontmatter(text);
  if (parsed.kind !== "ok") return undefined;
  const worktrees = recordField(parsed.data, "worktrees");
  const root = worktrees && stringField(worktrees, "root");
  return root?.replace(/^~(?=\/|$)/, home);
}

function writeRoot(file: string, root: string): Result<void> {
  try {
    if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `---\nworktrees:\n  root: ${JSON.stringify(root)}\n---\n\nPersonal spec-driven settings for this clone, never committed. Claude rewrites this when you ask.\n`);
    return { ok: true, value: undefined };
  } catch (cause) {
    return { ok: false, reason: `cannot write ${file}: ${cause instanceof Error ? cause.message : String(cause)}` };
  }
}
