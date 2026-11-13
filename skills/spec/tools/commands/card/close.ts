import { gitAt } from "../../core/git";
import { isoTimestamp } from "../../core/schedule";
import type { PhaseDeps } from "../../plan/phase-writer";
import { answererOf } from "../../questions/who";
import { sendCardIntent } from "./send";

// `card close <id> "<evidence>"` | `card drop <id> "<reason>"`: a card is never deleted, it ends with why.
export async function endCard(projectDir: string, status: "done" | "dropped", args: readonly string[], deps: PhaseDeps, usage: string): Promise<string> {
  const [id, why, ...extra] = args;
  if (!id || !why?.trim() || extra.length > 0) return `usage: ${usage}`;
  const action = status === "done" ? "close" : "drop";
  const by = answererOf(gitAt(projectDir, deps.runner));
  return sendCardIntent(projectDir, deps, action, () => ({ action: "close", id, status, why: why.trim(), by, at: isoTimestamp(deps.now()) }));
}
