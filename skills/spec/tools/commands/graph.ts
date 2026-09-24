import { join } from "node:path";
import { formatIssues } from "../doctor/issue";
import { linkIssues } from "../graph/checks";
import { blockers, neighborhood } from "../graph/neighborhood";
import { isFinished, loadNodes, type SpecNode } from "../graph/nodes";
import { specsTouching, undeclaredOverlaps } from "../graph/overlap";
import { renderLinks } from "../graph/render";
import { undeclaredMentions } from "../graph/suggest";
import { toProjectPath } from "../lessons/recall";

const USAGE = "usage: graph <spec-name> | graph files <path…> | graph suggest <spec-name>";

export function graphCommand(projectDir: string, args: readonly string[]): string {
  const [first, ...rest] = args;
  const nodes = loadNodes(projectDir);
  if (first === "files") return filesReport(nodes, rest.map((path) => toProjectPath(path, projectDir)));
  if (first === "suggest") return suggestReport(nodes, rest[0]);
  if (!first) return USAGE;
  return neighborhoodReport(nodes, first, projectDir);
}

export function neighborhoodReport(nodes: ReadonlyMap<string, SpecNode>, name: string, projectDir: string): string {
  const node = nodes.get(name);
  if (!node) return `graph: no spec named ${name}`;
  const links = neighborhood(nodes, name);
  const blocking = blockers(links).map((link) => `${link.other}${link.phases ? `#${link.phases}` : ""}`);
  const issues = linkIssues(nodes, name, join(node.spec.dir, "CLAUDE.md"));
  return [
    `${name} (${isFinished(node) ? "finished" : "open"})`,
    renderLinks(links, undeclaredOverlaps(nodes, name)),
    `Blocked by: ${blocking.length > 0 ? blocking.join(", ") : "nothing"}`,
    issues.length > 0 ? formatIssues(issues, projectDir) : "",
  ].filter(Boolean).join("\n");
}

function filesReport(nodes: ReadonlyMap<string, SpecNode>, paths: readonly string[]): string {
  if (paths.length === 0) return USAGE;
  const touching = specsTouching(nodes, paths);
  if (touching.length === 0) return "No spec's code-map lists these files.";
  return touching.map((hit) => `- ${hit.other} (${stateOf(nodes.get(hit.other))}): ${hit.shared.slice(0, 4).join(", ")}`).join("\n");
}

function suggestReport(nodes: ReadonlyMap<string, SpecNode>, name: string | undefined): string {
  if (!name) return USAGE;
  const mentions = undeclaredMentions(nodes, name);
  if (mentions.length === 0) return `${name}: no undeclared spec mentions in its prose.`;
  const lines = mentions.map((mention) => `- ${mention.other}  (${mention.file}: ${mention.line})`);
  return `${name} mentions these specs without a declared relation. Pick a type for each or leave it as prose:\n${lines.join("\n")}`;
}

function stateOf(node: SpecNode | undefined): string {
  return node && isFinished(node) ? "finished" : "open";
}
