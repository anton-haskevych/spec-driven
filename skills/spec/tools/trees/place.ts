import type { PhaseActivity } from "../board/activity";
import type { BoardRunners } from "../board/load";
import { prClaimGroup } from "../claims/pr-claim";
import type { HeldClaim } from "../claims/rules";
import type { Result } from "../core/result";
import { INVALID_OWNER, isOffered } from "../core/people";
import type { SpecState } from "../core/spec-state";
import type { Env } from "../core/env";
import type { LiveSession } from "../sessions/live";
import type { Workspace } from "../workspaces/list";
import type { AddedTree } from "./acquire";
import { describeHolder, findTree, treeHolder, type GroupPhases } from "./find";
import { treeName, type TreeName } from "./naming";
import type { SetupReport } from "./setup";

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

// existingOnly: a babysitter needs the tree that holds the PR's code, never a fresh one.
// onlyFor: the crew's runner; a spec owned by someone else is refused before any tree is cut.
export interface PlaceOptions {
  existingOnly?: boolean;
  onlyFor?: string;
}

export interface PlaceWorld {
  ownSessionId?: string;
  defaultBranch: string;
  worktrees: Workspace[];
  sessions: Result<LiveSession[]>;
  claims: HeldClaim[];
  activity: ReadonlyMap<string, PhaseActivity>;
  // Base first, then this checkout's own copy: a phase added on a branch isn't on base yet.
  views: SpecState[];
  // ownerOf the spec on base (where `spec.ts owner` lands), else of this checkout's copy.
  owner?: string;
}

export interface PlaceRequest extends PlaceOptions {
  spec: string;
  phase: string;
}

export interface PlacementDeps {
  loadWorld(spec: string): Promise<Result<PlaceWorld>>;
  addTree(name: TreeName, world: PlaceWorld): Promise<Result<Placement>>;
  hasUncommittedChanges(path: string): boolean;
}

export async function placeTree(request: PlaceRequest, deps: PlacementDeps): Promise<Result<Placement>> {
  const { spec, phase } = request;
  const world = await deps.loadWorld(spec);
  if (!world.ok) return world;
  const { views, worktrees, sessions, claims } = world.value;
  const group = groupPhases(views, spec, phase);
  if (!group.ok) return group;
  const name = treeName(spec, group.value.prGroup);
  const found = findTree(name, group.value, world.value);
  const refused = request.onlyFor === undefined ? undefined : ownerRefusal(spec, world.value.owner, request.onlyFor, found && { branch: found.branch ?? name.branch, path: found.path });
  if (refused) return { ok: false, reason: refused };
  if (!found) return request.existingOnly ? { ok: false, reason: `no tree for ${name.branch}` } : deps.addTree(name, world.value);
  const view = { sessions, claims, worktreePaths: worktrees.map((worktree) => worktree.path), ownSessionId: world.value.ownSessionId };
  const holder = treeHolder(found.path, view, () => deps.hasUncommittedChanges(found.path));
  const branch = found.branch ?? name.branch;
  return { ok: true, value: holder ? { kind: "busy", branch, path: found.path, holder: describeHolder(holder) } : { kind: "found", branch, path: found.path } };
}

// The crew asks for a spec its runner may not take; deliberate sessions never pass onlyFor.
function ownerRefusal(spec: string, owner: string | undefined, onlyFor: string, tree: { branch: string; path: string } | undefined): string | undefined {
  if (owner === undefined || isOffered(owner, onlyFor)) return undefined;
  const malformed = owner === INVALID_OWNER;
  const whose = malformed ? `${spec}'s owner: is malformed` : `${spec} is ${owner}'s`;
  const refusal = `${whose}; this crew is ${onlyFor}'s. Open it in your own session instead`;
  return tree ? `${refusal}; its work so far is on ${tree.branch} in ${tree.path}. Push it or hand it to ${malformed ? "its owner" : owner}` : refusal;
}

function groupPhases(views: readonly SpecState[], spec: string, phase: string): Result<GroupPhases & { prGroup?: string }> {
  const claimedGroup = prClaimGroup(phase);
  if (claimedGroup !== undefined) return wholeGroup(views, spec, claimedGroup);
  const state = views.find((view) => view.phases.some((candidate) => candidate.id === phase));
  const picked = state?.phases.find((candidate) => candidate.id === phase);
  if (!state || !picked) return { ok: false, reason: `phase ${phase} is not in ${spec}` };
  const prGroup = picked.edges.pr;
  const phases = state.phases.filter((candidate) => candidate.edges.pr === prGroup).map((candidate) => candidate.id);
  return { ok: true, value: { spec, phases, ...(prGroup === undefined ? {} : { prGroup }) } };
}

function wholeGroup(views: readonly SpecState[], spec: string, prGroup: string): Result<GroupPhases & { prGroup?: string }> {
  const state = views.find((view) => view.phases.some((candidate) => candidate.edges.pr === prGroup));
  if (!state) return { ok: false, reason: `PR group ${prGroup} is not in ${spec}` };
  return { ok: true, value: { spec, phases: state.phases.filter((candidate) => candidate.edges.pr === prGroup).map((candidate) => candidate.id), prGroup } };
}
