import { error, warning, type Issue } from "../doctor/issue";
import type { SpecNode } from "./nodes";
import { undeclaredOverlaps } from "./overlap";
import { phasesInRef } from "./relations";

const CHAINED = new Set(["needs", "part-of"]);

export function graphIssues(nodes: ReadonlyMap<string, SpecNode>, name: string, file: string): Issue[] {
  const overlaps = undeclaredOverlaps(nodes, name).map((overlap) =>
    warning(file, `shares ${overlap.shared.slice(0, 3).join(", ")} with active spec ${overlap.other} but declares no relation`),
  );
  return [...linkIssues(nodes, name, file), ...overlaps];
}

export function linkIssues(nodes: ReadonlyMap<string, SpecNode>, name: string, file: string): Issue[] {
  const node = nodes.get(name);
  if (!node) return [];
  return [...relationIssues(nodes, node, file), ...cycleIssues(nodes, name, file), ...supersededButOpen(nodes, node, file)];
}

function relationIssues(nodes: ReadonlyMap<string, SpecNode>, node: SpecNode, file: string): Issue[] {
  return node.relations.flatMap((relation) => {
    const label = `${relation.type} ${relation.target}${relation.phases ? `#${relation.phases}` : ""}`;
    const target = nodes.get(relation.target);
    if (relation.target === node.spec.name) return [error(file, `${label} points at itself`)];
    if (!target) return [error(file, `${label}: no spec named ${relation.target}`)];
    const ids = target.phases.map((phase) => phase.id);
    if (relation.phases && phasesInRef(relation.phases, ids).length === 0) {
      return [error(file, `${label}: ${relation.target} has no phase ${relation.phases} (phases: ${ids.join(", ") || "none"})`)];
    }
    return [];
  });
}

function cycleIssues(nodes: ReadonlyMap<string, SpecNode>, name: string, file: string): Issue[] {
  const path = findCycle(nodes, name, name, new Set());
  return path ? [error(file, `needs/part-of cycle: ${[name, ...path].join(" → ")}`)] : [];
}

function findCycle(nodes: ReadonlyMap<string, SpecNode>, start: string, current: string, visited: Set<string>): string[] | undefined {
  for (const relation of nodes.get(current)?.relations ?? []) {
    if (!CHAINED.has(relation.type)) continue;
    if (relation.target === start) return [start];
    if (visited.has(relation.target)) continue;
    visited.add(relation.target);
    const rest = findCycle(nodes, start, relation.target, visited);
    if (rest) return [relation.target, ...rest];
  }
  return undefined;
}

function supersededButOpen(nodes: ReadonlyMap<string, SpecNode>, node: SpecNode, file: string): Issue[] {
  const ids = node.phases.map((phase) => phase.id);
  return [...nodes.values()].flatMap((other) =>
    other.relations
      .filter((r) => r.type === "supersedes" && r.target === node.spec.name && r.phases)
      .flatMap((r) => {
        const covered = phasesInRef(r.phases ?? "", ids);
        const open = node.phases.filter((phase) => covered.includes(phase.id) && !phase.done).map((phase) => phase.id);
        return open.length > 0
          ? [warning(file, `phases ${open.join(", ")} are superseded by ${other.spec.name} but still open; tick them with a note or drop them`)]
          : [];
      }),
  );
}
