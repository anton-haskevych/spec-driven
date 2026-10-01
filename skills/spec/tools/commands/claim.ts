import { phaseActivity, type PhaseActivity } from "../board/activity";
import { loadBoardInputs } from "../board/load";
import { claimStatus, holderName, isStale, takeRefusal, type ClaimContext } from "../claims/rules";
import { claimsDir, loadClaims, pruneClaims, releaseClaims, takeClaim, type Claim, type TakeOutcome } from "../claims/store";
import { gitAt } from "../core/git";
import type { Result } from "../core/result";
import type { SpecState } from "../core/spec-state";
import type { Env } from "../launch/terminal";
import { loadLiveSessions } from "../sessions/live";
import { psProcStarts } from "../sessions/proc-starts";
import { loadWorkspaces } from "../workspaces/list";
import { systemBoardDeps, type BoardDeps } from "./board";

export const CLAIM_USAGE = "claim take <spec> <phase> | claim release <spec> [<phase>] | claim list";

export interface ClaimDeps extends BoardDeps {
  env: Env;
}

export function systemClaimDeps(): ClaimDeps {
  return { ...systemBoardDeps(), env: process.env };
}

interface ClaimWorld {
  dir: string;
  context: ClaimContext;
  activity: ReadonlyMap<string, PhaseActivity>;
  currentPath: string;
  ownStates?: ReadonlyMap<string, SpecState>;
  branch?: string;
}

export async function claimCommand(projectDir: string, args: readonly string[], deps: ClaimDeps = systemClaimDeps()): Promise<string> {
  const [action, spec, phase, ...extra] = args;
  const sessionId = deps.env.CLAUDE_CODE_SESSION_ID || undefined;
  if (action === "list" && !spec) return withWorld(projectDir, deps, listClaims);
  if (action === "take" && spec && phase && extra.length === 0) return withWorld(projectDir, deps, (world) => take(world, spec, phase, sessionId, deps.now));
  if (action === "release" && spec && extra.length === 0) return withWorld(projectDir, deps, (world) => release(world, spec, phase, sessionId, deps.now));
  return `usage: ${CLAIM_USAGE}`;
}

async function withWorld(projectDir: string, deps: ClaimDeps, act: (world: ClaimWorld) => string): Promise<string> {
  const world = await loadClaimWorld(projectDir, deps);
  return world.ok ? act(world.value) : `claim: ${world.reason}`;
}

async function loadClaimWorld(projectDir: string, deps: ClaimDeps): Promise<Result<ClaimWorld>> {
  const git = gitAt(projectDir, deps.runner);
  const dir = claimsDir(git);
  if (!dir.ok) return dir;
  const worktrees = loadWorkspaces(git);
  if (!worktrees.ok) return worktrees;
  const inputs = await loadBoardInputs(projectDir, { local: true }, deps);
  if (!inputs.ok) return inputs;
  const { states, workspaces, currentPath } = inputs.value;
  return {
    ok: true,
    value: {
      dir: dir.value,
      context: { sessions: loadLiveSessions(deps.claudeHome, psProcStarts(deps.runner)), worktrees: new Set(worktrees.value.map((worktree) => worktree.path)), baseStates: states },
      activity: phaseActivity(states, workspaces),
      currentPath,
      ownStates: workspaces.find((workspace) => workspace.path === currentPath)?.states,
      branch: worktrees.value.find((worktree) => worktree.path === currentPath)?.branch,
    },
  };
}

function take(world: ClaimWorld, spec: string, phase: string, sessionId: string | undefined, now: Date): string {
  const view = { activity: world.activity, currentPath: world.currentPath, baseState: world.context.baseStates.get(spec), ownState: world.ownStates?.get(spec) };
  const refusal = takeRefusal(spec, phase, view);
  if (refusal) return `claim refused: ${refusal}`;
  const stale = (existing: Claim) => isStale(claimStatus(existing, world.context));
  if (!sessionId) return heldWithoutSession(world, spec, phase, stale);
  pruneClaims(world.dir, sessionId, (existing) => removable(existing, world.context), now);
  const claim = newClaim(world, spec, phase, sessionId, now);
  return describeTake(takeClaim(world.dir, claim, stale), spec, phase, world.context);
}

function heldWithoutSession(world: ClaimWorld, spec: string, phase: string, stale: (claim: Claim) => boolean): string {
  const { claims, unreadable } = loadClaims(world.dir);
  const holder = claims.find((claim) => claim.spec === spec && claim.phase === phase && !stale(claim));
  if (holder) return refusedBy(holder, spec, phase);
  if (unreadable.includes(`${spec}#${phase}.json`)) return refusedBy("unreadable", spec, phase);
  return "claim: no session id; not claimed";
}

function newClaim(world: ClaimWorld, spec: string, phase: string, sessionId: string, now: Date): Claim {
  const sessions = world.context.sessions.ok ? world.context.sessions.value : [];
  const sessionName = sessions.find((session) => session.sessionId === sessionId)?.name;
  return {
    spec,
    phase,
    sessionId,
    ...(sessionName ? { sessionName } : {}),
    workspace: world.currentPath,
    ...(world.branch ? { branch: world.branch } : {}),
    claimedAt: now.toISOString(),
  };
}

function describeTake(outcome: TakeOutcome, spec: string, phase: string, context: ClaimContext): string {
  switch (outcome.kind) {
    case "taken":
      return `claim: took ${spec} phase ${phase}`;
    case "already-yours":
      return `claim: ${spec} phase ${phase} is already yours`;
    case "took-over":
      return `claim: took over ${spec} phase ${phase} from ${holderName(outcome.from)} (${claimStatus(outcome.from, context)})`;
    case "held":
      return refusedBy(outcome.by, spec, phase);
  }
}

function refusedBy(holder: Claim | "unreadable", spec: string, phase: string): string {
  if (holder === "unreadable") return `claim refused: ${spec} phase ${phase} has an unreadable claim file; remove it if no session holds it`;
  return `claim refused: ${spec} phase ${phase} is claimed by ${holderName(holder)} in ${holder.workspace}`;
}

function release(world: ClaimWorld, spec: string, phase: string | undefined, sessionId: string | undefined, now: Date): string {
  if (!sessionId) return "claim: no session id; nothing released";
  const released = releaseClaims(world.dir, sessionId, spec, phase);
  pruneClaims(world.dir, sessionId, (existing) => removable(existing, world.context), now);
  if (released.length === 0) return `claim: nothing to release for ${spec}`;
  return `claim: released ${spec} phase ${released.map((claim) => claim.phase).join(", ")}`;
}

function listClaims(world: ClaimWorld): string {
  const { claims, unreadable } = loadClaims(world.dir);
  const lines = [
    ...claims.map((claim) => `${claim.spec}#${claim.phase}  ${claimStatus(claim, world.context)}  ${holderName(claim)}  ${claim.workspace}`),
    ...unreadable.map((name) => `${name}  unreadable`),
  ];
  return lines.length > 0 ? lines.join("\n") : "claim: no claims";
}

// Closed claims stay: the board lists them under needs you until someone resumes or releases them.
function removable(claim: Claim, context: ClaimContext): boolean {
  const status = claimStatus(claim, context);
  return status === "done" || status === "gone";
}
