import type { Result } from "../../core/result";
import type { LiveSession } from "../../sessions/live";
import type { SessionReader } from "../read-sessions";
import type { ClaudeSource, RuntimeSession, SessionSnapshot } from "../sessions";

export function claudeSessionReader(source: ClaudeSource, load: () => Result<readonly LiveSession[]>): SessionReader {
  return { source, read: async (observedAt) => claudeSnapshot(source, load(), observedAt) };
}

export function claudeSnapshot(source: ClaudeSource, loaded: Result<readonly LiveSession[]>, observedAt: string): SessionSnapshot {
  if (!loaded.ok) return { sessions: [], coverage: [{ source, state: "unavailable", reason: loaded.reason }] };
  return {
    sessions: loaded.value.map((session) => normalizeSession(source, session, observedAt)),
    coverage: [{ source, state: "complete" }],
  };
}

function normalizeSession(source: ClaudeSource, session: LiveSession, observedAt: string): RuntimeSession {
  return {
    ref: { source, id: session.sessionId },
    cwd: session.cwd,
    status: session.status,
    observedAt,
    changedAt: session.updatedAt.toISOString(),
    changedFrom: session.updatedFrom,
    ...(session.name ? { name: session.name } : {}),
    ...(session.nameSource ? { nameSource: session.nameSource } : {}),
    ...(session.parkedJobId ? { continuation: { source, id: session.parkedJobId } } : {}),
  };
}
