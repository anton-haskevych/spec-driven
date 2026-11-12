import { basename } from "node:path";
import type { Git } from "../core/git";
import type { Result } from "../core/result";
import type { AsyncRunner } from "../core/run";
import { findSpecs } from "../core/spec-folders";
import { loadSpecStateFromFiles } from "../core/spec-state";
import { scanWorkspaces } from "../workspaces/scan";
import type { JoinCopy } from "./join";

// Each live worktree of this clone whose copy of the spec differs from the default branch's.
export async function readTreeCopies(git: Git, asyncRunner: AsyncRunner, baseSha: string, spec: string): Promise<Result<JoinCopy[]>> {
  const scanned = await scanWorkspaces(git, asyncRunner, baseSha, new Set());
  if (!scanned.ok) return { ok: false, reason: `can't read the worktrees: ${scanned.reason}` };
  const copies = scanned.value.scans
    .filter(({ specs }) => specs.includes(spec))
    .flatMap(({ workspace }) => findSpecs(workspace.path, spec).slice(0, 1).map((folder) => ({ tree: basename(workspace.path), head: workspace.head, state: loadSpecStateFromFiles(folder) })));
  return { ok: true, value: copies };
}
