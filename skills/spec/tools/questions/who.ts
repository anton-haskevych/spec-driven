import { basename } from "node:path";
import type { Env } from "../core/env";
import { authorName, runnerName, type Git } from "../core/git";
import { ownSessionId } from "../sessions/own";

// The session that asks, else the tree it asks from.
export function askerOf(env: Env, projectDir: string): string {
  return ownSessionId(env) ?? `tree ${basename(projectDir)}`;
}

// The person whose words the answer quotes: the configured git name, else git's author name.
export function answererOf(git: Git): string {
  const configured = runnerName(git);
  return configured.ok ? configured.value : (authorName(git) ?? "unknown");
}
