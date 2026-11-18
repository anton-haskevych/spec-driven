import type { Git } from "../core/git";
import type { LaunchTitle } from "../launch/title";
import { DEFAULT_PR_GROUP } from "../plan/docs/pr-doc";
import type { Task } from "../plan/docs/phase-doc";
import { recordedCommit } from "../plan/docs/task-evidence";
import { branchOf, laneOf, type SpecLayout } from "../pr/groups";
import { findCrewLine, type CrewLine } from "./crew-line";

// Spec-branch mode (crew tick): each spec's layout, and a phase's tasks as the record holds them.
export interface SpecBranchWorld {
  layouts?: ReadonlyMap<string, SpecLayout>;
  phaseTasks?: (spec: string, phase: string) => readonly Task[] | undefined;
}

export interface LaneTarget {
  spec: string;
  lane: string;
  specBranch: string;
  // The commit the phase's last code tick pushed, from the record.
  recorded?: string;
}

export interface LaneFacts {
  mergedBack: boolean;
  handedOff: boolean;
  crewLine?: CrewLine;
}

export function laneTarget(title: LaunchTitle, branch: string, world: SpecBranchWorld): LaneTarget | undefined {
  const layout = world.layouts?.get(title.spec);
  if (!layout || !title.phase || laneOf(layout, branch) === undefined) return undefined;
  const recorded = recordedCommit(world.phaseTasks?.(title.spec, title.phase) ?? []);
  return { spec: title.spec, lane: branch, specBranch: branchOf(layout, DEFAULT_PR_GROUP), ...(recorded ? { recorded } : {}) };
}

// Merged back means the recorded commit is in feat/<spec>, never HEAD == origin/<lane>: the docs snapshot merge
// moves HEAD past the lane's pushed name (ledger: principle-close-out-reads-the-record).
export function laneFacts(git: Git, target: LaneTarget, launchedAt: string, lastTurn: string): LaneFacts {
  const fetched = git.run(["fetch", "-q", "origin", target.lane, target.specBranch]).code === 0;
  const mergedBack = fetched && target.recorded !== undefined && git.run(["merge-base", "--is-ancestor", target.recorded, `origin/${target.specBranch}`]).code === 0;
  const handoff = git.out(["log", `origin/${target.lane}`, `--since=${launchedAt}`, `--grep=^\\[handoff\\] ${target.spec}`, "--format=%B", "-1"]);
  const body = handoff.ok ? handoff.value : "";
  const crewLine = findCrewLine(lastTurn) ?? findCrewLine(body);
  return { mergedBack, handedOff: body !== "", ...(crewLine ? { crewLine } : {}) };
}
