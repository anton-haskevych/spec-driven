import { join } from "node:path";
import { phaseActivity } from "../board/activity";
import { loadBoardInputs, repoName } from "../board/load";
import { heldClaims } from "../claims/held";
import { gitAt, gitCommonDir } from "../core/git";
import type { Result } from "../core/result";
import { defaultBranch } from "../core/run";
import { readTextIfExists } from "../core/files";
import { parseFrontmatter } from "../core/frontmatter";
import { ownerOf } from "../core/people";
import { resolveSpec, type SpecFolder } from "../core/spec-folders";
import { readSpecMeta } from "../core/spec-meta";
import { loadSettings } from "../playbook/settings";
import { loadLiveSessions } from "../sessions/live";
import { ownSessionId } from "../sessions/own";
import { psProcStarts } from "../sessions/proc-starts";
import { loadWorkspaces } from "../workspaces/list";
import { addTree } from "./acquire";
import { treeRoot } from "./local-settings";
import type { TreeName } from "./naming";
import { copyIncludedFiles } from "./setup";
import { hasUncommittedChanges } from "./uncommitted";
import { PLACE_FETCH_TIMEOUT_MS, type PlaceDeps, type Placement, type PlacementDeps, type PlaceWorld } from "./place";

export function placeDepsFor(projectDir: string, deps: PlaceDeps): PlacementDeps {
  return {
    loadWorld: (spec) => loadPlaceWorld(projectDir, spec, deps),
    addTree: (name, world) => addPlacedTree(projectDir, name, world, deps),
    hasUncommittedChanges: (path) => hasUncommittedChanges(path, deps.runner),
  };
}

async function addPlacedTree(projectDir: string, name: TreeName, world: PlaceWorld, deps: PlaceDeps): Promise<Result<Placement>> {
  const git = gitAt(projectDir, deps.runner);
  const commonDir = gitCommonDir(git);
  if (!commonDir.ok) return commonDir;
  const defaultRoot = join(deps.home, "claude-worktrees", repoName(commonDir.value));
  const root = treeRoot(commonDir.value, world.worktrees, { defaultRoot, home: deps.home });
  if (!root.ok) return root;
  const added = addTree(git, name, root.value.root, world.defaultBranch, PLACE_FETCH_TIMEOUT_MS);
  if (!added.ok) return added;
  const { kind: how, path, offline } = added.value;
  const main = world.worktrees.find((worktree) => worktree.isMain)?.path ?? projectDir;
  const bootstrap = loadSettings(projectDir).gates.bootstrap;
  const notice = root.value.notice;
  return {
    ok: true,
    value: {
      kind: "added",
      branch: name.branch,
      path,
      how,
      setup: copyIncludedFiles(deps.runner, main, path),
      ...(offline ? { offline } : {}),
      ...(bootstrap ? { bootstrap } : {}),
      ...(notice ? { rootNotice: notice } : {}),
    },
  };
}

async function loadPlaceWorld(projectDir: string, spec: string, deps: PlaceDeps): Promise<Result<PlaceWorld>> {
  const git = gitAt(projectDir, deps.runner);
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return { ok: false, reason: "no default branch (origin/HEAD is unset and gh did not answer)" };
  const worktrees = loadWorkspaces(git);
  if (!worktrees.ok) return worktrees;
  const inputs = await loadBoardInputs(projectDir, { local: true }, deps);
  if (!inputs.ok) return inputs;
  const { nodes, states, workspaces, plans, joinedActivity } = inputs.value;
  const own = resolveSpec(projectDir, spec);
  const views = [states.get(spec), typeof own === "string" ? undefined : plans.state(own)].filter((view) => view !== undefined);
  if (views.length === 0) return { ok: false, reason: typeof own === "string" ? own : `no spec named ${spec}` };
  const baseMeta = nodes.get(spec)?.meta;
  const owner = baseMeta ? ownerOf(baseMeta) : typeof own === "string" ? undefined : checkoutOwner(own);
  const sessions = loadLiveSessions(deps.claudeHome, psProcStarts(deps.runner));
  return {
    ok: true,
    value: { ownSessionId: ownSessionId(deps.env), defaultBranch: branch, worktrees: worktrees.value, sessions, claims: heldClaims(git, sessions, states), activity: phaseActivity(states, workspaces, joinedActivity), views, ...(owner === undefined ? {} : { owner }) },
  };
}

function checkoutOwner(folder: SpecFolder): string | undefined {
  const parsed = parseFrontmatter(readTextIfExists(join(folder.dir, "CLAUDE.md")) ?? "");
  return parsed.kind === "ok" ? ownerOf(readSpecMeta(parsed.data)) : undefined;
}

