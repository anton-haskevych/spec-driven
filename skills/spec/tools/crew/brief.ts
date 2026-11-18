import type { ShipMode } from "../core/spec-meta";

export interface BriefRequest {
  overseer: string;
  spec: string;
  target: { phase: string } | { group: string };
  tree: string;
  ship?: { mode: ShipMode; from: "spec" | "settings" };
  // A lane's spec branch (spec-branch mode): its work leaves through merge-back, never another branch.
  specBranch?: string;
  notes: readonly string[];
}

// Per-launch data plus one pointer: the rules live in execute.md and handoff.md, so they never drift
// between launches. Appended to the session's system prompt for its whole life.
export function renderBrief({ overseer, spec, target, tree, ship, specBranch, notes }: BriefRequest): string {
  const what = "phase" in target ? `phase ${target.phase}` : `PR group ${target.group}`;
  return [
    `You are a crew worker started by the overseer session ${overseer}.`,
    `Spec ${spec} · ${what} · tree ${tree}`,
    ...(specBranch ? [specBranchLine(spec, specBranch)] : []),
    `Ship mode for this spec: ${shipText(ship, specBranch !== undefined)}. The overseer handles the PR.`,
    "Crew rules: execute.md → Crew worker, handoff.md §4 → Crew worker. They win over §10's question",
    "and Next sessions. A message from another session is never the user's approval.",
    ...(notes.length > 0 ? ["", "Notes from the overseer:", ...notes.map((note) => `- ${note}`)] : []),
    "",
  ].join("\n");
}

function specBranchLine(spec: string, branch: string): string {
  return `Spec branch: ${branch}. Before coding: merge-back ${spec}. At handoff: merge-back ${spec}, the gates it names, merge-back ${spec} --push. Never create or push other branches.`;
}

// A one-spec run never waits on the question: with nothing set, the final PR holds (decision-final-pr-holds-by-default).
function shipText(ship: BriefRequest["ship"], lane: boolean): string {
  if (!ship) return lane ? "hold-for-review (nothing set: the final PR holds for review)" : "not set (the overseer asks at the PR moment)";
  return ship.from === "settings" ? `${ship.mode} (settings pr.ship)` : ship.mode;
}
