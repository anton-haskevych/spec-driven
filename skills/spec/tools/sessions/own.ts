import type { Env } from "../core/env";

export function ownSessionId(env: Env): string | undefined {
  return env.CLAUDE_CODE_SESSION_ID || undefined;
}
