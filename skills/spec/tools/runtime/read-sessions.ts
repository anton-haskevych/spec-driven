import type { Result } from "../core/result";
import { sameSource, sessionKey, sourceKey } from "./identity";
import type { SessionSnapshot, SourceRef } from "./sessions";

export interface SessionReader {
  source: SourceRef;
  read(observedAt: string): Promise<SessionSnapshot>;
}

export async function readSessionSnapshot(readers: readonly SessionReader[], observedAt: string): Promise<Result<SessionSnapshot>> {
  if (new Set(readers.map((reader) => sourceKey(reader.source))).size !== readers.length) {
    return { ok: false, reason: "duplicate execution source configuration" };
  }
  const snapshots = await Promise.all(readers.map((reader) => readSource(reader, observedAt)));
  return { ok: true, value: {
    sessions: snapshots.flatMap((snapshot) => snapshot.sessions),
    coverage: snapshots.flatMap((snapshot) => snapshot.coverage),
  } };
}

async function readSource(reader: SessionReader, observedAt: string): Promise<SessionSnapshot> {
  const unavailable = (reason: string): SessionSnapshot => ({
    sessions: [], coverage: [{ source: reader.source, state: "unavailable", reason }],
  });
  try {
    const snapshot = await reader.read(observedAt);
    const coverage = snapshot.coverage.length === 1 ? snapshot.coverage[0] : undefined;
    if (!coverage || !sameSource(coverage.source, reader.source)
      || snapshot.sessions.some((session) => !sameSource(session.ref.source, reader.source))
      || new Set(snapshot.sessions.map((session) => sessionKey(session.ref))).size !== snapshot.sessions.length
      || (coverage.state === "verified-absent" && snapshot.sessions.length > 0)) {
      return unavailable("session source returned inconsistent observations");
    }
    return snapshot;
  } catch {
    return unavailable("session source read failed");
  }
}
