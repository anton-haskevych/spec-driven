import { hostname } from "node:os";
import { phaseActivity, type PhaseActivity } from "../board/activity";
import { ago } from "../board/cells";
import { loadBoardInputs } from "../board/load";
import { claimStatus, holderName, isStale, takeRefusal, type ClaimContext } from "../claims/rules";
import { claimsDir, loadClaims, pruneClaims, releaseClaims, takeClaim, type Claim, type TakeOutcome } from "../claims/store";
import { claimContext } from "../claims/held";
import { readHolder, type RemoteClaim } from "../claims/remote";
import { remoteHolderName, type Holder } from "../claims/remote-payload";
import { gitRemotePort, mirrorRelease, mirrorTake, type RemotePort } from "../claims/remote-take";
import { gitAt, type Git } from "../core/git";
import type { Result } from "../core/result";
import type { SpecState } from "../core/spec-state";
import { loadLiveSessions } from "../sessions/live";
import { ownSessionId } from "../sessions/own";
import { psProcStarts } from "../sessions/proc-starts";
import { loadWorkspaces } from "../workspaces/list";
import { systemBoardDeps, type BoardDeps } from "./board";

const TAKE_OVER_FLAG = "--take-over";
const TAKE_OVER_HINT = 'say "take it over" to take it anyway';
const OFFLINE_TAKE = "claim: origin unreachable; claimed locally only";
const OFFLINE_RELEASE = "claim: origin unreachable; released locally only";

export const CLAIM_USAGE = "claim take <spec> <phase> [--take-over] | claim release <spec> [<phase>] | claim list";

export interface ClaimDeps extends BoardDeps {
  host: string;
}

export function systemClaimDeps(): ClaimDeps {
  return { ...systemBoardDeps(), host: hostname() };
}

interface ClaimWorld {
  dir: string;
  context: ClaimContext;
  activity: ReadonlyMap<string, PhaseActivity>;
  currentPath: string;
  ownStates?: ReadonlyMap<string, SpecState>;
  branch?: string;
  remote?: RemotePort;
  holder: Holder;
  now: Date;
}

export async function claimCommand(projectDir: string, args: readonly string[], deps: ClaimDeps = systemClaimDeps()): Promise<string> {
  const takeOver = args.includes(TAKE_OVER_FLAG);
  const [action, spec, phase, ...extra] = args.filter((arg) => arg !== TAKE_OVER_FLAG);
  const sessionId = ownSessionId(deps.env);
  if (action === "list" && !spec) return withWorld(projectDir, deps, listClaims);
  if (action === "take" && spec && phase && extra.length === 0) return withWorld(projectDir, deps, (world) => take(world, spec, phase, sessionId, takeOver));
  if (action === "release" && spec && extra.length === 0 && !takeOver) return withWorld(projectDir, deps, (world) => release(world, spec, phase, sessionId));
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
  const sessions = loadLiveSessions(deps.claudeHome, psProcStarts(deps.runner));
  return {
    ok: true,
    value: {
      dir: dir.value,
      context: claimContext(git, sessions, states, loadClaims(dir.value).claims),
      activity: phaseActivity(states, workspaces),
      currentPath,
      ownStates: workspaces.find((workspace) => workspace.path === currentPath)?.states,
      branch: worktrees.value.find((worktree) => worktree.path === currentPath)?.branch,
      ...remoteOf(git, deps.host),
      now: deps.now,
    },
  };
}

function remoteOf(git: Git, host: string): { remote?: RemotePort; holder: Holder } {
  const remote = gitRemotePort(git);
  return { ...(remote ? { remote } : {}), holder: readHolder(git, host) };
}

function take(world: ClaimWorld, spec: string, phase: string, sessionId: string | undefined, takeOver: boolean): string {
  const refusal = phaseRefusal(world, spec, phase, takeOver);
  if (refusal) return refusal;
  const stale = takeOver ? () => true : (existing: Claim) => isStale(claimStatus(existing, world.context));
  if (!sessionId) return heldWithoutSession(world, spec, phase, stale);
  pruneClaims(world.dir, sessionId, (existing) => removable(existing, world.context), world.now);
  const claim = newClaim(world, spec, phase, sessionId);
  const outcome = takeClaim(world.dir, claim, stale);
  if (outcome.kind === "held") return describeTake(outcome, spec, phase, world.context);
  if (!world.remote) return withTheirBranch(describeTake(outcome, spec, phase, world.context), outcome.kind === "took-over" ? outcome.from : undefined);
  const displaced = outcome.kind === "took-over" ? outcome.from : undefined;
  const payload = { claim: displaced ? { ...claim, takenFrom: displaced.sessionId } : claim, holder: world.holder };
  const mirrored = mirrorTake(world.remote, payload, takeOver ? () => true : (existing) => existing.sessionId === displaced?.sessionId);
  if (mirrored.kind === "held") {
    releaseClaims(world.dir, sessionId, spec, phase);
    return remoteRefusal(mirrored.by, spec, phase, world.now);
  }
  if (mirrored.kind === "offline") return `${describeTake(outcome, spec, phase, world.context)}\n${OFFLINE_TAKE}`;
  const remoteFrom = mirrored.kind === "took-over" ? mirrored.from : undefined;
  const taken = displaced || !remoteFrom ? describeTake(outcome, spec, phase, world.context) : `claim: took over ${spec} phase ${phase} from ${remoteHolderName(remoteFrom)}`;
  return withTheirBranch(taken, remoteFrom?.claim ?? displaced, world.remote);
}

// A missing phase always refuses; work in progress elsewhere refuses unless the user said to take it over.
function phaseRefusal(world: ClaimWorld, spec: string, phase: string, takeOver: boolean): string | undefined {
  const view = { activity: world.activity, currentPath: world.currentPath, baseState: world.context.baseStates.get(spec), ownState: world.ownStates?.get(spec) };
  const missing = takeRefusal(spec, phase, { ...view, activity: new Map() });
  if (missing) return `claim refused: ${missing}`;
  const busy = takeOver ? undefined : takeRefusal(spec, phase, view);
  return busy ? `claim refused: ${busy}; ${TAKE_OVER_HINT}` : undefined;
}

function withTheirBranch(taken: string, previous: Claim | undefined, remote?: RemotePort): string {
  if (!previous?.branch) return taken;
  const onOrigin = remote?.hasBranch(previous.branch);
  const where = onOrigin === undefined ? "" : onOrigin ? " (on origin)" : " (not on origin)";
  return `${taken}\nclaim: their work is on ${previous.branch}${where}`;
}

function remoteRefusal(holder: RemoteClaim | undefined, spec: string, phase: string, now: Date): string {
  const by = holder ? `${remoteHolderName(holder)} ${ago(new Date(holder.claim.claimedAt), now)} ago` : "another machine (unreadable on origin)";
  return `claim refused: ${spec} phase ${phase} is claimed by ${by}; ${TAKE_OVER_HINT}`;
}

function heldWithoutSession(world: ClaimWorld, spec: string, phase: string, stale: (claim: Claim) => boolean): string {
  const { claims, unreadable } = loadClaims(world.dir);
  const holder = claims.find((claim) => claim.spec === spec && claim.phase === phase && !stale(claim));
  if (holder) return refusedBy(holder, spec, phase);
  if (unreadable.includes(`${spec}#${phase}.json`)) return refusedBy("unreadable", spec, phase);
  return "claim: no session id; not claimed";
}

function newClaim(world: ClaimWorld, spec: string, phase: string, sessionId: string): Claim {
  const sessions = world.context.sessions.ok ? world.context.sessions.value : [];
  const sessionName = sessions.find((session) => session.sessionId === sessionId)?.name;
  return {
    spec,
    phase,
    sessionId,
    ...(sessionName ? { sessionName } : {}),
    workspace: world.currentPath,
    ...(world.branch ? { branch: world.branch } : {}),
    claimedAt: world.now.toISOString(),
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
  return `claim refused: ${spec} phase ${phase} is claimed by ${holderName(holder)} in ${holder.workspace}; ${TAKE_OVER_HINT}`;
}

function release(world: ClaimWorld, spec: string, phase: string | undefined, sessionId: string | undefined): string {
  if (!sessionId) return "claim: no session id; nothing released";
  const local = releaseClaims(world.dir, sessionId, spec, phase).map((claim) => claim.phase);
  pruneClaims(world.dir, sessionId, (existing) => removable(existing, world.context), world.now);
  const mirrored = world.remote ? mirrorRelease(world.remote, spec, phase, sessionId) : undefined;
  const takenOver = takenOverLines(world, spec, phase, sessionId, mirrored?.kind === "released" ? mirrored.takenOver : []);
  const released = [...new Set([...local, ...(mirrored?.kind === "released" ? mirrored.phases : [])])].filter((id) => !takenOver.has(id));
  const lines = [
    ...(released.length > 0 ? [`claim: released ${spec} phase ${released.join(", ")}`] : []),
    ...takenOver.values(),
    ...(mirrored?.kind === "offline" ? [OFFLINE_RELEASE] : []),
  ];
  return lines.length > 0 ? lines.join("\n") : `claim: nothing to release for ${spec}`;
}

// By phase; origin's view wins because it names the machine.
function takenOverLines(world: ClaimWorld, spec: string, phase: string | undefined, sessionId: string, remote: readonly RemoteClaim[]): Map<string, string> {
  const line = (id: string, by: string, since: string) => `claim: phase ${id} was taken over by ${by} ${ago(new Date(since), world.now)} ago; your work is on ${world.branch ?? "your branch"}`;
  const local = loadClaims(world.dir).claims.filter((claim) => claim.takenFrom === sessionId && claim.spec === spec && (phase === undefined || claim.phase === phase));
  return new Map([
    ...local.map((claim) => [claim.phase, line(claim.phase, holderName(claim), claim.claimedAt)] as const),
    ...remote.map((theirs) => [theirs.claim.phase, line(theirs.claim.phase, remoteHolderName(theirs), theirs.claim.claimedAt)] as const),
  ]);
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
