import type { LaunchTitle } from "../launch/title";
import type { Agent } from "../sessions/agents";
import type { CloseOut } from "./close-out";
import type { LaunchedEntry } from "./run-state";

export type IdAction = { kind: "wait" } | { kind: "close-out" } | { kind: "attach"; waitingFor: string } | { kind: "hand-off" };

export interface CloseOutOutcome {
  remove: boolean;
  lines: string[];
  log?: string;
  relaunch?: { spec: string; phase: string };
}

// The roster table in technical.md → Waiting. A babysitter holding its PR claim is waiting on CI
// whatever the roster says, and an unknown state is never acted on.
export function nextAction(title: LaunchTitle, agent: Agent | undefined, claimLive: boolean): IdAction {
  if (title.sub === "babysit" && claimLive) return { kind: "wait" };
  if (!agent || agent.state === "done" || agent.state === "stopped") return { kind: "close-out" };
  if (agent.state === "blocked" && agent.waitingFor) return { kind: "attach", waitingFor: agent.waitingFor };
  if (agent.state === "blocked") return title.sub === "babysit" ? { kind: "close-out" } : { kind: "hand-off" };
  return { kind: "wait" };
}

export function actionLines(entry: LaunchedEntry, action: IdAction): string[] {
  if (action.kind === "attach") return [`Needs you: ${entry.title} · ${entry.id} waits on ${action.waitingFor} → claude attach ${entry.id}`];
  if (action.kind === "hand-off") return [`Hand off now → SendMessage "${entry.title}" (${entry.id} ended its turn on text)`];
  return [];
}

export function afterCloseOut(entry: LaunchedEntry, title: LaunchTitle, verdict: CloseOut, gone: boolean, at: string): CloseOutOutcome {
  const who = `${entry.title} · ${entry.id}`;
  if (verdict.kind === "waiting") return { remove: false, lines: [] };
  if (verdict.kind === "missing") {
    const missing = verdict.missing.join(", ");
    return { remove: false, lines: [gone ? `Needs you: ${who} is gone; close-out missing ${missing}` : `Close-out ${who}: missing ${missing} → SendMessage "${entry.title}" once`] };
  }
  if (title.sub === "babysit") return { remove: true, lines: [`Babysitter ${who}: ${verdict.report}`], log: `${at} ${entry.title} finished · ${verdict.report} · stopped ${entry.id}` };
  const crew = verdict.crewLine;
  const lines = [`Closed out ${who} · ${verdict.report}`];
  if (crew?.prGroupReady) lines.push(`PR group ready: ${title.spec} ${crew.prGroupReady} → the PR moment`);
  if (crew && crew.needsYou > 0) lines.push(`Needs you: ${title.spec} ${title.phase} asks ${crew.needsYou} (its in-flight note on its branch)`);
  if (crew && crew.sayIfWrong > 0) lines.push(`Say if wrong: ${title.spec} ${title.phase} lists ${crew.sayIfWrong} in its handoff`);
  const relaunch = crew?.next === "same phase" && title.phase ? { spec: title.spec, phase: title.phase } : undefined;
  return { remove: true, lines, log: `${at} ${title.spec} ${title.phase} done · close-out ok · stopped ${entry.id}`, ...(relaunch ? { relaunch } : {}) };
}
