import type { CrewLine } from "./crew-line";

export interface CloseOutFacts {
  tree?: string;
  dirty: boolean;
  pushed: boolean;
  handedOff: boolean;
  crewLine?: CrewLine;
  claimLive: boolean;
}

export type CloseOut = { kind: "ok"; report: string; crewLine?: CrewLine } | { kind: "missing"; missing: string[] } | { kind: "waiting"; claim: string };

export function closeOutVerdict(facts: CloseOutFacts): CloseOut {
  if (facts.tree === undefined) return { kind: "missing", missing: ["its tree (session gone, no claim)"] };
  const missing = [
    facts.dirty ? `uncommitted changes in ${facts.tree}` : undefined,
    facts.pushed ? undefined : "commits not on origin",
    facts.handedOff ? undefined : "no [handoff] commit since launch",
    facts.crewLine ? undefined : "no Crew: line",
    facts.claimLive ? "claim still live" : undefined,
  ].filter((item) => item !== undefined);
  if (missing.length > 0 || !facts.crewLine) return { kind: "missing", missing };
  return { kind: "ok", report: facts.crewLine.raw, crewLine: facts.crewLine };
}

// A babysitter idle on `pr wait` reads done in the roster; its live PR claim says it is waiting.
export function babysitterVerdict(group: string, claimLive: boolean, lastTurn: string): CloseOut {
  if (claimLive) return { kind: "waiting", claim: `pr-${group}` };
  const lastLine = lastTurn.trim().split("\n").at(-1)?.trim();
  return { kind: "ok", report: lastLine || "(no final message)" };
}

export function closeOutLine(verdict: CloseOut): string {
  if (verdict.kind === "ok") return `Close-out: ok · ${verdict.report}`;
  if (verdict.kind === "waiting") return `Close-out: waiting (${verdict.claim} claim live)`;
  return `Close-out: missing ${verdict.missing.join(", ")}`;
}
