import { existsSync, realpathSync } from "node:fs";
import type { Git } from "../core/git";
import type { Result } from "../core/result";

export interface Workspace {
  path: string;
  head: string;
  branch?: string;
  detached: boolean;
  locked: boolean;
  prunable: boolean;
  isMain: boolean;
}

const BRANCH_REF_PREFIX = "refs/heads/";

export function loadWorkspaces(git: Git): Result<Workspace[]> {
  const listed = git.run(["--no-optional-locks", "worktree", "list", "--porcelain"]);
  if (listed.code !== 0) return { ok: false, reason: `git worktree list failed: ${listed.stderr.trim() || `exit ${listed.code}`}` };
  return { ok: true, value: parseWorktreeList(listed.stdout).map((workspace) => ({ ...workspace, path: canonicalPath(workspace.path) })) };
}

// Session cwds and claims hold resolved paths (macOS: /private/var, not /var); compare like with like.
function canonicalPath(path: string): string {
  return existsSync(path) ? realpathSync(path) : path;
}

// `git worktree list --porcelain`: one block of attribute lines per worktree, blank-line separated,
// the main worktree first (git-worktree(1), "Porcelain Format").
export function parseWorktreeList(porcelain: string): Workspace[] {
  const blocks = porcelain.split(/\n\n+/).map((block) => block.split("\n").filter(Boolean));
  return blocks.flatMap((lines, index) => {
    const workspace = parseBlock(lines, index === 0);
    return workspace ? [workspace] : [];
  });
}

function parseBlock(lines: string[], isFirst: boolean): Workspace | undefined {
  const attributes = new Map(lines.map((line) => splitAttribute(line)));
  const path = attributes.get("worktree");
  if (path === undefined || attributes.has("bare")) return undefined;
  const branchRef = attributes.get("branch");
  return {
    path,
    head: attributes.get("HEAD") ?? "",
    ...(branchRef === undefined ? {} : { branch: branchRef.replace(BRANCH_REF_PREFIX, "") }),
    detached: attributes.has("detached"),
    locked: attributes.has("locked"),
    prunable: attributes.has("prunable"),
    isMain: isFirst,
  };
}

function splitAttribute(line: string): [string, string] {
  const space = line.indexOf(" ");
  return space === -1 ? [line, ""] : [line.slice(0, space), line.slice(space + 1)];
}
