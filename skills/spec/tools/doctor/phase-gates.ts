import { join } from "node:path";
import { parseFrontmatter } from "../core/frontmatter";
import { GATE_KINDS, gateItemText, isGateKind } from "../core/gate";
import type { PhaseState, SpecState } from "../core/spec-state";
import { error, warning, type Issue } from "./issue";

export function phaseGateIssues(state: SpecState, onlyPointer?: string): Issue[] {
  return state.phases
    .filter((phase) => !onlyPointer || phase.pointer === onlyPointer)
    .flatMap((phase) => checkPhase(join(state.spec.dir, phase.pointer), phase));
}

function checkPhase(file: string, phase: PhaseState): Issue[] {
  const parsed = parseFrontmatter(phase.entry ?? "");
  const raw = parsed.kind === "ok" ? parsed.data.gate : undefined;
  if (raw === undefined) return [];
  if (!isGateKind(raw)) return [error(file, `gate must be ${GATE_KINDS.join(" or ")}, not "${String(raw)}"`)];
  const hasGateItem = (phase.entry ?? "").split("\n").some((line) => gateItemText(line) !== undefined);
  if (hasGateItem) return [];
  return [warning(file, `gate: ${raw}, but no deliverable starts "Gate:"; add one saying who approves (e.g. - [ ] Gate: design agreed with Anton)`)];
}
