import { warning, type Issue } from "../doctor/issue";
import { isFinished, type SpecNode } from "./nodes";

// Specs that declare `supersedes: [name]`, whole or by phase: the computed "superseded by".
export function supersededBy(nodes: ReadonlyMap<string, SpecNode>, name: string): string[] {
  const others = [...nodes.values()].filter((other) => other.relations.some((relation) => relation.type === "supersedes" && relation.target === name));
  return others.map((other) => other.spec.name).toSorted();
}

export function lifecycleIssues(nodes: ReadonlyMap<string, SpecNode>, node: SpecNode, file: string): Issue[] {
  const name = node.spec.name;
  const { stale, dropped } = node.meta;
  const issues: Issue[] = [];
  if (node.status === "abandoned" && dropped === undefined && supersededBy(nodes, name).length === 0) {
    issues.push(warning(file, `abandoned with no reason: add dropped: "<why>", or supersedes: [${name}] on the spec that took the work`));
  }
  if (dropped !== undefined && node.status !== "abandoned") {
    issues.push(warning(file, `dropped: is only for an abandoned spec (status is ${node.status ?? "unset"}); remove it or set status: abandoned`));
  }
  if (stale !== undefined && isFinished(node)) issues.push(warning(file, "stale: on a finished spec; remove it (stale marks open work whose text drifted)"));
  return issues;
}
