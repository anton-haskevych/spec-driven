import type { SessionRef, SourceRef } from "./sessions";

export function sourceKey(source: SourceRef): string {
  return JSON.stringify([source.runtime, source.key]);
}

export function sessionKey(ref: SessionRef): string {
  return JSON.stringify([ref.source.runtime, ref.source.key, ref.id]);
}

export function sameSource(first: SourceRef, second: SourceRef): boolean {
  return sourceKey(first) === sourceKey(second);
}

export function sameSession(first: SessionRef, second: SessionRef): boolean {
  return sessionKey(first) === sessionKey(second);
}
