import { join } from "node:path";
import { phaseActivity, type PhaseActivity } from "../board/activity";
import { loadBoardInputs, repoName, type BoardRunners } from "../board/load";
import { heldClaims } from "../claims/held";
import type { HeldClaim } from "../claims/rules";
import { gitAt, gitCommonDir, type Git } from "../core/git";
import type { Result } from "../core/result";
import { defaultBranch } from "../core/run";
import { resolveSpec } from "../core/spec-folders";
import { loadSpecState, type SpecState } from "../core/spec-state";
import type { Env } from "../core/env";
import { loadSettings } from "../playbook/settings";
import { loadLiveSessions, type LiveSession } from "../sessions/live";
import { ownSessionId } from "../sessions/own";
import { psProcStarts } from "../sessions/proc-starts";
import { loadWorkspaces, type Workspace } from "../workspaces/list";
import { addTree, type AddedTree } from "./acquire";
import { describeHolder, findTree, treeHolder, type GroupPhases } from "./find";
import { treeRoot } from "./local-settings";
import { treeName, type TreeName } from "./naming";
import { copyIncludedFiles, type SetupReport } from "./setup";
import { hasUncommittedChanges } from "./uncommitted";

export const PLACE_FETCH_TIMEOUT_MS = 10_000;

export interface PlaceDeps extends BoardRunners {
  env: Env;
  home: string;
}

export type Placement = { branch: string; path: string; rootNotice?: string } & (
  | { kind: "found" }
  | { kind: "busy"; holder: string }
  | { kind: "added"; how: AddedTree["kind"]; offline?: string; setup: SetupReport; bootstrap?: string }
);

interface PlaceWorld {
  git: Git;
  defaultBranch: string;
  worktrees: Workspace[];
  sessions: Result<LiveSession[]>;
  claims: HeldClaim[];
  activity: ReadonlyMap<string, PhaseActivity>;
  // Base first, then this checkout's own copy: a phase added on a branch isn't on base yet.
  views: SpecState[];
}

export async function placeTree(projectDir: string, spec: string, phase: string, deps: PlaceDeps): Promise<Result<Placement>> {
  const world = await loadPlaceWorld(projectDir, spec, deps);
  if (!world.ok) return world;
  const { views, worktrees, sessions, claims } = world.value;
  const group = groupPhases(views, spec, phase);
  if (!group.ok) return group;
  const name = treeName(spec, group.value.prGroup);
  const found = findTree(name, group.value, world.value);
  if (!found) return addPlacedTree(projectDir, name, world.value, deps);
  const view = { sessions, claims, worktreePaths: worktrees.map((worktree) => worktree.path), ownSessionId: ownSessionId(deps.env) };
  const holder = treeHolder(found.path, view, () => hasUncommittedChanges(found.path, deps.runner));
  const branch = found.branch ?? name.branch;
  return { ok: true, value: holder ? { kind: "busy", branch, path: found.path, holder: describeHolder(holder) } : { kind: "found", branch, path: found.path } };
}

async function addPlacedTree(projectDir: string, name: TreeName, world: PlaceWorld, deps: PlaceDeps): Promise<Result<Placement>> {
  const commonDir = gitCommonDir(world.git);
  if (!commonDir.ok) return commonDir;
  const defaultRoot = join(deps.home, "claude-worktrees", repoName(commonDir.value));
  const root = treeRoot(commonDir.value, world.worktrees, { defaultRoot, home: deps.home });
  if (!root.ok) return root;
  const added = addTree(world.git, name, root.value.root, world.defaultBranch, PLACE_FETCH_TIMEOUT_MS);
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
  const { states, workspaces } = inputs.value;
  const own = resolveSpec(projectDir, spec);
  const views = [states.get(spec), typeof own === "string" ? undefined : loadSpecState(own)].filter((view) => view !== undefined);
  if (views.length === 0) return { ok: false, reason: typeof own === "string" ? own : `no spec named ${spec}` };
  const sessions = loadLiveSessions(deps.claudeHome, psProcStarts(deps.runner));
  return {
    ok: true,
    value: { git, defaultBranch: branch, worktrees: worktrees.value, sessions, claims: heldClaims(git, sessions, states), activity: phaseActivity(states, workspaces), views },
  };
}

function groupPhases(views: readonly SpecState[], spec: string, phase: string): Result<GroupPhases & { prGroup?: string }> {
  const state = views.find((view) => view.phases.some((candidate) => candidate.id === phase));
  const picked = state?.phases.find((candidate) => candidate.id === phase);
  if (!state || !picked) return { ok: false, reason: `phase ${phase} is not in ${spec}` };
  const prGroup = picked.edges.pr;
  const phases = state.phases.filter((candidate) => candidate.edges.pr === prGroup).map((candidate) => candidate.id);
  return { ok: true, value: { spec, phases, ...(prGroup === undefined ? {} : { prGroup }) } };
}
