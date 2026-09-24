import { isFinished, type SpecNode } from "./nodes";
import { phasesInRef, type Relation, type RelationType } from "./relations";

export interface Link {
  type: RelationType | "child" | "needed-by" | "superseded-by";
  other: string;
  phases?: string;
  note?: string;
  open: boolean;
}

const REVERSE: Partial<Record<RelationType, Link["type"]>> = {
  "part-of": "child",
  needs: "needed-by",
  supersedes: "superseded-by",
  related: "related",
};

export function neighborhood(nodes: ReadonlyMap<string, SpecNode>, name: string): Link[] {
  const node = nodes.get(name);
  if (!node) return [];
  const outgoing = node.relations.map((relation) => ({
    type: relation.type,
    other: relation.target,
    phases: relation.phases,
    note: relation.note,
    open: isOpen(nodes.get(relation.target), relation),
  }));
  return [...outgoing, ...incoming(nodes, name)];
}

function incoming(nodes: ReadonlyMap<string, SpecNode>, name: string): Link[] {
  const links: Link[] = [];
  for (const other of nodes.values()) {
    for (const relation of other.relations) {
      const type = REVERSE[relation.type];
      if (relation.target !== name || !type || other.spec.name === name) continue;
      links.push({ type, other: other.spec.name, phases: relation.phases, note: relation.note, open: !isFinished(other) });
    }
  }
  return links;
}

export function isOpen(target: SpecNode | undefined, relation: Relation): boolean {
  if (!target) return true;
  if (!relation.phases) return !isFinished(target);
  const ids = phasesInRef(relation.phases, target.phases.map((phase) => phase.id));
  return target.phases.some((phase) => ids.includes(phase.id) && !phase.done);
}

export function blockers(links: readonly Link[]): Link[] {
  return links.filter((link) => link.type === "needs" && link.open);
}
