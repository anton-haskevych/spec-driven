import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Workspace } from "../workspaces/list";

// Folders beside this repo's trees that git doesn't know as worktrees: listed for a person, never removed.
// The main checkout's own parent is skipped, since its siblings are other projects.
export function strayFolders(worktrees: readonly Workspace[]): string[] {
  const mainParent = worktrees.filter(({ isMain }) => isMain).map(({ path }) => dirname(path));
  const registered = worktrees.map(({ path }) => path);
  const parents = new Set(worktrees.filter(({ isMain }) => !isMain).map(({ path }) => dirname(path)));
  return [...parents]
    .filter((parent) => !mainParent.includes(parent))
    .flatMap(childFolders)
    .filter((folder) => !registered.some((path) => path === folder || path.startsWith(`${folder}/`)))
    .toSorted();
}

function childFolders(parent: string): string[] {
  try {
    return readdirSync(parent, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => join(parent, entry.name));
  } catch {
    return [];
  }
}
