import { filesToTouch } from "../core/phase-entry";
import type { PhaseState } from "../core/spec-state";

export interface ReviewPhase {
  id: string;
  name: string;
  outcome?: string;
  files: string[];
  commits: string[];
}

interface EvidencedTask {
  done: boolean;
  evidence?: string;
}

const SHORT_SHA = 7;
// A code tick's evidence is `<sha> on origin/<branch>`; join's is a bare sha. Anything else (a link, a person) is no commit.
const LEADING_SHA = /^([0-9a-f]{7,40})\b/;

// `tasks`: the phase's record tasks; a spec in files has no evidence, so no commits.
export function reviewPhase(phase: PhaseState, tasks: readonly EvidencedTask[]): ReviewPhase {
  const outcome = phase.summary?.outcome;
  return { id: phase.id, name: phase.name, ...(outcome ? { outcome } : {}), files: filesToTouch(phase.entry ?? ""), commits: commitsOf(tasks) };
}

export function withPhaseSections(steps: string, phases: readonly ReviewPhase[]): string {
  return phases.length === 0 ? steps : `${steps.trimEnd()}\n\n${phaseSections(phases)}\n`;
}

export function commitsOf(tasks: readonly EvidencedTask[]): string[] {
  const shas = tasks.flatMap((task) => {
    const sha = task.done ? LEADING_SHA.exec(task.evidence ?? "")?.[1] : undefined;
    return sha === undefined ? [] : [sha.slice(0, SHORT_SHA)];
  });
  return [...new Set(shas)];
}

export function phaseSections(phases: readonly ReviewPhase[]): string {
  return phases.map(phaseSection).join("\n\n");
}

function phaseSection({ id, name, outcome, files, commits }: ReviewPhase): string {
  return [
    `### Phase ${id} — ${name}`,
    ...(outcome ? [`Outcome: ${outcome}`] : []),
    ...(files.length > 0 ? [`Files: ${files.join("; ")}`] : []),
    ...(commits.length > 0 ? [`Commits: ${commits.join(", ")}`] : []),
  ].join("\n");
}
