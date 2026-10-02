import { gitAt } from "../core/git";
import type { Runner } from "../core/run";
import type { Env } from "../launch/terminal";
import { loadLiveSessions } from "../sessions/live";
import { psProcStarts } from "../sessions/proc-starts";
import { holderName } from "./rules";
import { claimsDir, loadClaims } from "./store";

export type HeldPhases = ReadonlyMap<string, string>;

export interface HeldReaderDeps {
  runner: Runner;
  claudeHome: string;
  env: Env;
}

// The phases `claim take` would refuse this session: live or unknown-liveness claims of other sessions.
// Closed, gone and done claims can be taken over, so they don't count.
export function heldByOthers(projectDir: string, deps: HeldReaderDeps): HeldPhases {
  const dir = claimsDir(gitAt(projectDir, deps.runner));
  if (!dir.ok) return new Map();
  const ownSessionId = deps.env.CLAUDE_CODE_SESSION_ID;
  const others = loadClaims(dir.value).claims.filter((claim) => claim.sessionId !== ownSessionId);
  if (others.length === 0) return new Map();
  const sessions = loadLiveSessions(deps.claudeHome, psProcStarts(deps.runner));
  const held = others.filter((claim) => !sessions.ok || sessions.value.some((session) => session.sessionId === claim.sessionId));
  return new Map(held.map((claim) => [`${claim.spec}#${claim.phase}`, holderName(claim)]));
}
