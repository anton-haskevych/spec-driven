import { sameSession, sameSource, sessionKey } from "./identity";
import type { RuntimeSession, SessionRef } from "./sessions";

export function isSessionDescendant(session: RuntimeSession, ancestor: SessionRef, sessions: readonly RuntimeSession[]): boolean {
  if (sameSession(session.ref, ancestor) || !sameSource(session.ref.source, ancestor.source)) return false;
  const visited = new Set([sessionKey(session.ref)]);
  let current = session;
  while (current.parent) {
    const parent = current.parent;
    if (!sameSource(parent.source, ancestor.source)) return false;
    if (sameSession(parent, ancestor)) return true;
    const key = sessionKey(parent);
    if (visited.has(key)) return false;
    visited.add(key);
    const next = sessions.find((candidate) => sameSession(candidate.ref, parent));
    if (!next) return false;
    current = next;
  }
  return false;
}
