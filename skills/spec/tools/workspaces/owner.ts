import { sep } from "node:path";

// In-repo trees (`<repo>/.claude/worktrees/x`) sit inside the main checkout: the deepest match owns the path.
export function ownerOf(path: string, worktrees: readonly string[]): string | undefined {
  const deepestFirst = worktrees.toSorted((a, b) => b.length - a.length);
  return deepestFirst.find((worktree) => path === worktree || path.startsWith(worktree + sep));
}
