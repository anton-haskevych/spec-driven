import { existsSync } from "node:fs";
import type { WorkspaceView } from "../board/inputs";
import { listSpecs } from "../core/spec-folders";
import { loadSpecState, type SpecState } from "../core/spec-state";
import { loadNodes, type SpecNode } from "../graph/nodes";
import type { WorkspaceScan } from "./scan";

// Each live worktree's own state of the specs it changed. listSpecs requires CLAUDE.md, so a spec folder
// that lost it (deleted or renamed on the branch) is skipped.
export function loadWorkspaceViews(scans: readonly WorkspaceScan[], baseNodes: ReadonlyMap<string, SpecNode>): WorkspaceView[] {
  return scans.map(({ workspace, specs }) => {
    const changed = new Set(specs);
    const folders = existsSync(workspace.path) ? listSpecs(workspace.path).filter((folder) => changed.has(folder.name)) : [];
    const states = new Map<string, SpecState>();
    for (const folder of folders) if (!states.has(folder.name)) states.set(folder.name, loadSpecState(folder));
    const missingFromBase = [...states.keys()].filter((name) => !baseNodes.has(name));
    return {
      path: workspace.path,
      ...(workspace.branch ? { branch: workspace.branch } : {}),
      isMain: workspace.isMain,
      states,
      branchOnly: branchOnlyNodes(workspace.path, missingFromBase),
    };
  });
}

function branchOnlyNodes(path: string, names: readonly string[]): Map<string, SpecNode> {
  if (names.length === 0) return new Map();
  const nodes = loadNodes(path);
  return new Map(names.flatMap((name) => {
    const node = nodes.get(name);
    return node ? [[name, node] as const] : [];
  }));
}
