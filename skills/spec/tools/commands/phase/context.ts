import { systemRunner } from "../../core/run";
import { resolveSpec } from "../../core/spec-folders";
import { phaseWriterFor, type PhaseDeps, type PhaseWriter } from "../../plan/phase-writer";
import { planMemoryFor } from "../../plan/plan-version";
import { readPlansAt, type PlanSource } from "../../plan/read-plans";
import { OLDER_PLUGIN } from "../../record/write";
import type { LocalPilot } from "../../runtime/workflow-capabilities";

// What every action gets: the writer for its spec, picked once from one read of the record. A record on a
// newer layout reads as nothing; writing the files then would put the change where nobody reads it.
export interface PhaseContext {
  projectDir: string;
  deps: PhaseDeps;
  workflow?: LocalPilot;
  writerFor(specName: string): PhaseWriter | string;
  isJoined(specName: string): boolean;
}

export function systemPhaseDeps(): PhaseDeps {
  const memory = planMemoryFor(process.env);
  return { runner: systemRunner, env: process.env, now: () => new Date(), ...(memory ? { memory } : {}) };
}

export function phaseContext(projectDir: string, deps: PhaseDeps, workflow?: LocalPilot): PhaseContext {
  let plans: PlanSource | undefined;
  const read = () => (plans ??= readPlansAt(projectDir, deps, deps.now()));
  return {
    projectDir,
    deps,
    ...(workflow ? { workflow } : {}),
    writerFor(specName) {
      if (read().record.kind === "newer") return OLDER_PLUGIN;
      const spec = resolveSpec(projectDir, specName);
      return typeof spec === "string" ? spec : phaseWriterFor(projectDir, spec, read(), deps, workflow);
    },
    isJoined: (specName) => read().isJoined(specName),
  };
}
