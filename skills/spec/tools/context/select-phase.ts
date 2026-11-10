import { samePhase } from "../core/phase-title";
import type { Result } from "../core/result";
import type { PhaseState } from "../core/spec-state";
import { renderReadySet } from "../ready/render";
import { firstUnheld } from "./held-phases";
import type { PackInput } from "./packs";
import { normalizePhaseHint } from "./request";

type SelectionInput = Pick<PackInput, "state" | "ready" | "held">;

export function selectExecutePhase(input: SelectionInput, hint?: string): Result<{ phase: PhaseState; note: string }> {
  const id = hint ? normalizePhaseHint(hint) : undefined;
  const hinted = id && id.toLowerCase() !== "next" ? input.state.phases.find((phase) => samePhase(phase.id, id)) : undefined;
  const unheld = firstUnheld(input.state.spec.name, input.ready.ready, input.held);
  const phase = hinted ?? unheld.phase;
  if (!phase && unheld.skipped.length > 0) return { ok: false, reason: `Every ready phase is in flight in another session: ${unheld.skipped.join(", ")}. Tell the user and stop.` };
  if (!phase) return { ok: false, reason: noPhaseReady(input) };
  const others = input.ready.ready.length - unheld.skipped.length > 1 ? "first ready phase; others are ready too" : "first ready phase";
  const fallback = unheld.skipped.length > 0 ? `${others}; skipped ${unheld.skipped.join(", ")}` : others;
  const note = hinted ? `from your hint "${hint}"` : hint ? `hint "${hint}" matched no phase; ${fallback}` : fallback;
  return { ok: true, value: { phase, note } };
}

function noPhaseReady(input: SelectionInput): string {
  if (input.ready.waiting.length === 0) return "All phases complete — see pr-opening.md for the PR gate.";
  return `No phase is ready to start.\n${renderReadySet(input.ready)}\nTell the user what blocks the spec and stop.`;
}
