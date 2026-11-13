import { systemPhaseDeps } from "../commands/phase/context";
import type { PhaseDeps } from "../plan/phase-writer";
import { notARepoRunner } from "./stub-runner";

export function phaseDeps(overrides: Partial<PhaseDeps> = {}): PhaseDeps {
  return { ...systemPhaseDeps(), runner: notARepoRunner, ...overrides };
}
