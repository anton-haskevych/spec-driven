import type { BoardInputs } from "../board/inputs";
import { isRecent } from "../sessions/list";
import type { SessionDoc } from "../sessions/session-doc";
import type { PageSession, SessionState } from "./model";

export const WRITING_MINUTES = 5;
// Unpushed work in a tree that has been quiet this long reads red: work that could be lost.
export const SILENT_MINUTES = 30;
const MINUTE_MS = 60_000;

// Sessions that wrote in the last day. This machine's are checked by process, so a closed one drops out;
// another machine's can only be quiet, never dead (council: "last write is not liveness").
export function pageSessions(inputs: Pick<BoardInputs, "sessionDocs" | "sessions" | "claims" | "thisHost">, now: Date): PageSession[] {
  const live = inputs.sessions !== "local" && inputs.sessions.ok ? new Set(inputs.sessions.value.map((session) => session.sessionId)) : undefined;
  return inputs.sessionDocs
    .filter((doc) => isRecent(doc, now))
    .filter((doc) => doc.host !== inputs.thisHost || !live || live.has(doc.ref.id))
    .map((doc) => pageSession(doc, phaseHeldBy(inputs, doc), now));
}

function phaseHeldBy(inputs: Pick<BoardInputs, "claims">, doc: SessionDoc): string | undefined {
  return inputs.claims.find(({ claim }) => claim.sessionId === doc.ref.id && (!doc.spec || claim.spec === doc.spec))?.claim.phase;
}

function pageSession(doc: SessionDoc, phase: string | undefined, now: Date): PageSession {
  const unsaved = (doc.ahead ?? 0) + (doc.edited ?? 0) > 0 ? { ahead: doc.ahead ?? 0, edited: doc.edited ?? 0 } : undefined;
  return {
    person: doc.who,
    mode: doc.mode,
    host: doc.host,
    tree: doc.tree,
    ...(doc.spec ? { spec: doc.spec } : {}),
    ...(phase ? { phase } : {}),
    lastWriteAt: doc.lastWriteAt,
    state: stateOf(doc, unsaved !== undefined, now),
    ...(unsaved ? { unsaved } : {}),
  };
}

function stateOf(doc: SessionDoc, unsaved: boolean, now: Date): SessionState {
  const quietMinutes = (now.getTime() - Date.parse(doc.lastWriteAt)) / MINUTE_MS;
  if (quietMinutes < WRITING_MINUTES) return "writing";
  return unsaved && quietMinutes >= SILENT_MINUTES ? "silent" : "quiet";
}
