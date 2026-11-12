import { firstSentence } from "../core/phase-entry";
import type { PhaseState, SpecState } from "../core/spec-state";
import { RECORD_LAYOUT } from "../record/layout";
import { phaseNeeds } from "../ready/ready-set";
import { withoutUndefined } from "../core/read-fields";
import type { PhaseDoc } from "./docs/phase-doc";
import type { SpecDoc } from "./docs/spec-doc";
import { specPlanProblems } from "./docs/spec-plan";
import { entryTasks } from "./entry-tasks";
import { matchPhaseTasks, type TaskCopy } from "./join-tasks";

// One copy of a spec: the default branch's, or a worktree's (`tree` is its folder name).
export interface JoinCopy {
  tree: string;
  head: string;
  state: SpecState;
}

export interface JoinInput {
  spec: string;
  base: JoinCopy;
  trees: readonly JoinCopy[];
  // Whether a phase's prose file exists on the default branch.
  onBase(pointer: string): boolean;
  joinedAt: string;
}

// `recorded`: what a tree added that main lacked; `left`: disagreements nothing was written for.
export interface JoinPlan {
  spec: SpecDoc;
  phases: PhaseDoc[];
  recorded: string[];
  left: string[];
}

interface PhaseCopy {
  copy: JoinCopy;
  phase: PhaseState;
}

// Every copy of one phase; the first is the one ids and prose come from (main's when main has it).
type PhaseCopies = [PhaseCopy, ...PhaseCopy[]];

export function planJoin(input: JoinInput): JoinPlan | { refused: string } {
  const { merged, left } = mergePhaseLists(input);
  const where = (copy: JoinCopy) => (copy === input.base ? `on ${copy.tree}` : `in tree ${copy.tree}`);
  const order: SpecState = { ...input.base.state, phases: merged.map(([primary]) => primary.phase) };
  const recorded: string[] = [];
  const phases = merged.map((copies, index) => {
    const [primary, ...others] = copies;
    const taskCopy = ({ copy, phase }: PhaseCopy): TaskCopy => ({ where: where(copy), head: copy.head, tasks: entryTasks(phase.entry ?? "") });
    const matched = matchPhaseTasks(primary.phase.id, taskCopy(primary), others.map(taskCopy));
    recorded.push(...matched.recorded);
    left.push(...matched.left);
    return phaseDocOf(copies, phaseNeeds(order, primary.phase, index), matched.tasks, input.joinedAt);
  });
  const spec: SpecDoc = { name: input.spec, planVersion: 1, phases: phases.map((phase) => phase.id), joinedAt: input.joinedAt, joinedFrom: input.base.head, layout: RECORD_LAYOUT };
  const problems = specPlanProblems(spec, phases);
  if (problems.length > 0) return { refused: `${input.spec}'s plan has problems: ${problems.join("; ")}` };
  return { spec, phases, recorded, left: [...new Set(left)] };
}

// Main's phases in main's order; a phase only in a tree goes after the phase it follows there, when its
// file is on main (no other tree could open it otherwise).
function mergePhaseLists(input: JoinInput): { merged: PhaseCopies[]; left: string[] } {
  const merged: PhaseCopies[] = input.base.state.phases.map((phase) => [{ copy: input.base, phase }]);
  const left: string[] = [];
  const indexOf = (id: string) => merged.findIndex(([first]) => first.phase.id === id);
  for (const copy of input.trees) {
    copy.state.phases.forEach((phase, position) => {
      const at = indexOf(phase.id);
      if (at !== -1) merged[at]?.push({ copy, phase });
      else if (!input.onBase(phase.pointer)) left.push(`phase ${phase.id} is only in tree ${copy.tree} and its file is not on ${input.base.tree}; not added`);
      else merged.splice(indexAfter(copy.state.phases.slice(0, position), indexOf), 0, [{ copy, phase }]);
    });
  }
  return { merged, left };
}

function indexAfter(earlier: readonly PhaseState[], indexOf: (id: string) => number): number {
  const placed = earlier.map((phase) => indexOf(phase.id)).filter((index) => index !== -1);
  return placed.length === 0 ? 0 : Math.max(...placed) + 1;
}

function phaseDocOf(copies: PhaseCopies, needs: string[], tasks: PhaseDoc["tasks"], joinedAt: string): PhaseDoc {
  const [{ phase }] = copies;
  const { edges } = phase;
  const deployedCopy = copies.find((candidate) => candidate.phase.deployed)?.phase;
  const outcome = phase.summary?.outcome ? firstSentence(phase.summary.outcome) : undefined;
  return withoutUndefined({
    id: phase.id,
    title: phase.name,
    outcome: outcome ? `${outcome}.` : "",
    file: phase.pointer,
    needs,
    needsDeployed: edges.needsDeployed.length > 0 ? edges.needsDeployed : undefined,
    sameFilesAs: edges.sameFilesAs.length > 0 ? edges.sameFilesAs : undefined,
    pr: edges.pr,
    due: phase.schedule.due,
    code: phase.code,
    playbook: phase.playbook,
    gate: phase.gate,
    deployed: deployedCopy ? (deployedCopy.deployedOn ?? joinedAt.slice(0, 10)) : undefined,
    tasks,
  });
}
