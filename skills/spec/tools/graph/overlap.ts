import { isFinished, type SpecNode } from "./nodes";

export interface Overlap {
  other: string;
  shared: string[];
}

const HUB_LIMIT = 5;

export function undeclaredOverlaps(nodes: ReadonlyMap<string, SpecNode>, name: string): Overlap[] {
  const node = nodes.get(name);
  if (!node || isFinished(node)) return [];
  const open = [...nodes.values()].filter((other) => !isFinished(other));
  const usage = pathUsage(open);
  const own = new Set(node.codeMapPaths);

  return open.flatMap((other) => {
    if (other.spec.name === name || linked(node, other)) return [];
    const shared = other.codeMapPaths.filter((path) => own.has(path) && (usage.get(path) ?? 0) <= HUB_LIMIT);
    return shared.length > 0 ? [{ other: other.spec.name, shared }] : [];
  });
}

export function specsTouching(nodes: ReadonlyMap<string, SpecNode>, paths: readonly string[]): Overlap[] {
  return [...nodes.values()].flatMap((node) => {
    const shared = node.codeMapPaths.filter((path) => paths.some((wanted) => wanted === path || wanted.endsWith(`/${path}`) || path.endsWith(`/${wanted}`)));
    return shared.length > 0 ? [{ other: node.spec.name, shared }] : [];
  });
}

function pathUsage(nodes: readonly SpecNode[]): Map<string, number> {
  const usage = new Map<string, number>();
  for (const node of nodes) {
    for (const path of new Set(node.codeMapPaths)) usage.set(path, (usage.get(path) ?? 0) + 1);
  }
  return usage;
}

function linked(a: SpecNode, b: SpecNode): boolean {
  return a.relations.some((r) => r.target === b.spec.name) || b.relations.some((r) => r.target === a.spec.name);
}
