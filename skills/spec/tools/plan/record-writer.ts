import type { JoinedPlan } from "./state-source";
import type { PhaseDeps, PhaseOutcome, PhaseWriter } from "./phase-writer";
import { recordTick, tickWorld } from "./record-tick";

// A joined spec. Park and unpark write in-flight notes, which stay files until phase 7; the plan changes get
// their record path in phase 3a.
export function recordWriter(projectDir: string, spec: string, joined: JoinedPlan, files: PhaseWriter, deps: PhaseDeps): PhaseWriter {
  const notYet = (): PhaseOutcome => ({ kind: "invalid", reason: `${spec} is on the board; this version can't write it yet` });
  return {
    tick: (request) => recordTick(tickWorld(projectDir, deps), spec, joined, request),
    park: files.park,
    unpark: files.unpark,
    deployed: notYet,
    add: notYet,
    split: notYet,
  };
}
