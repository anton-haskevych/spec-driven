import type { Git } from "../core/git";
import type { Result } from "../core/result";
import { branchOnOrigin, deleteClaim, fetchClaims, pushClaim, remoteClaimOf, type Lease, type PushedClaim, type RemoteClaim } from "./remote";
import type { PushOutcome, RemotePayload } from "./remote-payload";
import type { Claim } from "./store";

export interface RemotePort {
  push(payload: RemotePayload, lease: Lease): PushedClaim;
  remove(spec: string, phase: string, sha: string): PushOutcome;
  fetch(): Result<RemoteClaim[]>;
  // undefined: origin didn't answer.
  hasBranch(branch: string): boolean | undefined;
}

export type MirrorTake =
  | { kind: "mirrored" }
  | { kind: "took-over"; from: RemoteClaim }
  | { kind: "held"; by?: RemoteClaim }
  | { kind: "offline"; reason: string };

export type MirrorRelease = { kind: "released"; phases: string[]; takenOver: RemoteClaim[] } | { kind: "offline"; reason: string };

const MAX_ATTEMPTS = 3;

// No origin remote: claims stay local, and there is nothing to report.
export function gitRemotePort(git: Git): RemotePort | undefined {
  if (!git.out(["remote", "get-url", "origin"]).ok) return undefined;
  return {
    push: (payload, lease) => pushClaim(git, payload, lease),
    remove: (spec, phase, sha) => deleteClaim(git, spec, phase, sha),
    fetch: () => fetchClaims(git),
    hasBranch: (branch) => branchOnOrigin(git, branch),
  };
}

// `replaceable` decides which existing holder the caller may push over: the closed session it just
// displaced locally, or anyone on an explicit take-over.
export function mirrorTake(port: RemotePort, payload: RemotePayload, replaceable: (existing: Claim) => boolean): MirrorTake {
  let lease: Lease = { kind: "absent" };
  let current = payload;
  let replaced: RemoteClaim | undefined;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const pushed = port.push(current, lease);
    if (pushed.kind === "pushed") return replaced ? { kind: "took-over", from: replaced } : { kind: "mirrored" };
    if (pushed.kind === "offline") return pushed;
    const claims = port.fetch();
    if (!claims.ok) return { kind: "held" };
    const existing = remoteClaimOf(claims.value, payload.claim.spec, payload.claim.phase);
    if (existing?.claim.sessionId === payload.claim.sessionId) return { kind: "mirrored" };
    if (existing && !replaceable(existing.claim)) return { kind: "held", by: existing };
    replaced = existing;
    lease = existing ? { kind: "at", sha: existing.sha } : { kind: "absent" };
    current = existing ? { ...payload, claim: { ...payload.claim, takenFrom: existing.claim.sessionId } } : payload;
  }
  return { kind: "held" };
}

export function mirrorRelease(port: RemotePort, spec: string, phase: string | undefined, sessionId: string): MirrorRelease {
  const claims = port.fetch();
  if (!claims.ok) return { kind: "offline", reason: claims.reason };
  const scoped = claims.value.filter((remote) => remote.claim.spec === spec && (phase === undefined || remote.claim.phase === phase));
  const phases: string[] = [];
  for (const own of scoped.filter((remote) => remote.claim.sessionId === sessionId)) {
    const removed = port.remove(spec, own.claim.phase, own.sha);
    if (removed.kind === "offline") return removed;
    if (removed.kind === "pushed") phases.push(own.claim.phase);
  }
  return { kind: "released", phases, takenOver: scoped.filter((remote) => remote.claim.takenFrom === sessionId) };
}

