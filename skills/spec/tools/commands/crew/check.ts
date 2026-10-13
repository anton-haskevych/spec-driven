import { heldClaims } from "../../claims/held";
import { gitAt } from "../../core/git";
import { closeOutLine } from "../../crew/close-out";
import { closeOut } from "../../crew/close-out-run";
import { runFileStore, systemCrewDeps, type CrewDeps } from "../../crew/deps";
import { parseRunFile } from "../../crew/run-state";
import { loadAgents } from "../../sessions/agents";

export const CREW_CHECK_USAGE = "crew check <id>";

export function crewCheck(projectDir: string, args: readonly string[], deps: CrewDeps = systemCrewDeps()): string {
  const [id, ...extra] = args;
  if (id === undefined || extra.length > 0) return `usage: ${CREW_CHECK_USAGE}`;
  const store = runFileStore(projectDir, deps.runner);
  if (!store.ok) return `crew check: ${store.reason}`;
  const entry = parseRunFile(store.value.read() ?? "").launched.find((launched) => launched.id === id);
  if (!entry) return `crew check: ${id} is not in ## Launched; the overseer closes out only its own sessions`;
  const agents = loadAgents(deps.runner);
  if (!agents.ok) return `crew check: ${agents.reason}`;
  const claims = heldClaims(gitAt(projectDir, deps.runner), deps.liveSessions(), new Map());
  const verdict = closeOut(entry, { agents: agents.value, claims, claudeHome: deps.claudeHome, runner: deps.runner });
  return verdict ? closeOutLine(verdict) : `crew check: ${entry.title} is not a launch title`;
}
