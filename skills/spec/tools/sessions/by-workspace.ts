import { ownerOf } from "../workspaces/owner";
import type { LiveSession } from "./live";

export function sessionsByWorkspace(sessions: readonly LiveSession[], paths: readonly string[]): Map<string, LiveSession[]> {
  const owned = new Map<string, LiveSession[]>();
  for (const session of sessions) {
    const owner = ownerOf(session.cwd, paths);
    if (owner) owned.set(owner, [...(owned.get(owner) ?? []), session]);
  }
  return owned;
}
