import type { PhaseState } from "../../core/spec-state";
import type { PrGroup } from "../groups";

export function prTitle(spec: string, group: PrGroup): string {
  const [first, ...rest] = group.phases;
  const name = first?.name ?? group.name ?? spec;
  return `${spec}: ${name}${rest.length > 0 ? ` (+${rest.length} more)` : ""}`;
}

export function prBody(specPath: string, group: PrGroup): string {
  const bullets = group.phases.map((phase) => `- ${plainWords(phase)}`);
  return [...(bullets.length > 0 ? [bullets.join("\n"), ""] : []), `Spec: ${specPath}/`].join("\n");
}

function plainWords(phase: PhaseState): string {
  return phase.summary?.outcome ?? phase.summary?.goal ?? phase.name;
}
