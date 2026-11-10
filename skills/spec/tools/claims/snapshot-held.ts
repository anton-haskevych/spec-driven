import { rowKey } from "../board/phase-keys";
import { sameSession, sameSource } from "../runtime/identity";
import type { SessionRef, SessionSnapshot } from "../runtime/sessions";
import { sessionLabel } from "../sessions/label";
import type { HeldPhases } from "./live";

export interface SessionPhaseClaim {
  spec: string;
  phase: string;
  ref: SessionRef;
  sessionName?: string;
}

interface HeldSnapshot {
  own: SessionRef;
  snapshot: SessionSnapshot;
}

export function heldPhasesFromSnapshot(claims: readonly SessionPhaseClaim[], context: HeldSnapshot): HeldPhases {
  const held = claims.filter((claim) => !sameSession(claim.ref, context.own) && mayBeLive(claim.ref, context.snapshot));
  return new Map(held.map((claim) => [rowKey(claim), sessionLabel(claim.sessionName, claim.ref.id)]));
}

function mayBeLive(ref: SessionRef, snapshot: SessionSnapshot): boolean {
  if (snapshot.sessions.some((session) => sameSession(ref, session.ref))) return true;
  const coverage = snapshot.coverage.filter((entry) => sameSource(ref.source, entry.source));
  return coverage.length !== 1 || coverage[0]?.state === "unavailable";
}
