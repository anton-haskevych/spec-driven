import { rowKey } from "../board/phase-keys";
import type { HeldPhases } from "../claims/live";
import type { PhaseState } from "../core/spec-state";

export function firstUnheld(spec: string, ready: readonly PhaseState[], held: HeldPhases): { phase?: PhaseState; skipped: string[] } {
  const skipped: string[] = [];
  for (const phase of ready) {
    const holder = held.get(rowKey({ spec, phase: phase.id }));
    if (!holder) return { phase, skipped };
    skipped.push(`${phase.id} (in flight: ${holder})`);
  }
  return { phase: undefined, skipped };
}

export function specsInFlight(held: HeldPhases, except: string): Map<string, string> {
  const specs = new Map<string, string>();
  for (const [key, holder] of held) {
    const spec = key.slice(0, key.lastIndexOf("#"));
    if (spec !== except && !specs.has(spec)) specs.set(spec, holder);
  }
  return specs;
}
