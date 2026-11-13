import type { SessionDoc } from "../sessions/session-doc";
import type { BoardInputs } from "./inputs";
import type { FocusRemoteSession } from "./model";

export type SessionDocInputs = Pick<BoardInputs, "sessionDocs" | "thisHost" | "sessions" | "claims">;

export function docOf(inputs: Pick<BoardInputs, "sessionDocs">, sessionId: string): SessionDoc | undefined {
  return inputs.sessionDocs.find((doc) => doc.ref.id === sessionId);
}

// The phase a session holds is its claim's, never copied onto its document.
export function claimedPhase({ claims }: Pick<BoardInputs, "claims">, sessionId: string, spec: string): string | undefined {
  return claims.find((held) => held.claim.sessionId === sessionId && held.claim.spec === spec)?.claim.phase;
}

export interface OtherMachineSession extends FocusRemoteSession {
  person: string;
  sessionId: string;
}

// Sessions on this spec that this machine can't see: another host's, whose document is all there is. One of
// this host's own that has no live process ended; it is not listed.
export function otherMachineSessions(inputs: SessionDocInputs, spec: string): OtherMachineSession[] {
  const live = inputs.sessions !== "local" && inputs.sessions.ok ? inputs.sessions.value : [];
  const here = inputs.thisHost.toLowerCase();
  return inputs.sessionDocs
    .filter((doc) => doc.spec === spec && doc.host.toLowerCase() !== here && !live.some((session) => session.sessionId === doc.ref.id))
    .map((doc) => {
      const phase = claimedPhase(inputs, doc.ref.id, spec);
      return { person: doc.who, sessionId: doc.ref.id, mode: doc.mode, host: doc.host, tree: doc.tree, ...(phase ? { phase } : {}), since: doc.lastWriteAt };
    });
}
