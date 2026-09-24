import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { parseFrontmatter, stringField } from "../core/frontmatter";
import { parsePhaseTitle } from "../core/phase-title";
import { parsePhaseLines } from "../core/progress";
import { listSpecs, type SpecFolder } from "../core/spec-folders";
import { parseRelations, type Relation } from "./relations";

export interface PhaseMark {
  id: string;
  done: boolean;
}

export interface SpecNode {
  spec: SpecFolder;
  status?: string;
  phases: PhaseMark[];
  codeMapPaths: string[];
  relations: Relation[];
}

const CODE_MAP_PATH = /^\s*\|\s*`([^`]+)`/;

export function loadNodes(projectDir: string): Map<string, SpecNode> {
  const nodes = new Map<string, SpecNode>();
  for (const spec of listSpecs(projectDir)) {
    if (!nodes.has(spec.name)) nodes.set(spec.name, loadNode(spec));
  }
  return nodes;
}

function loadNode(spec: SpecFolder): SpecNode {
  const meta = parseFrontmatter(readTextIfExists(join(spec.dir, "CLAUDE.md")) ?? "");
  const data = meta.kind === "ok" ? meta.data : {};
  const phases = parsePhaseLines(readTextIfExists(join(spec.dir, "progress.md")) ?? "").map((line, index) => ({
    id: parsePhaseTitle(line.title, String(index + 1)).id,
    done: line.done,
  }));
  return {
    spec,
    status: stringField(data, "status"),
    phases,
    codeMapPaths: codeMapPaths(readTextIfExists(join(spec.dir, "code-map.md")) ?? ""),
    relations: parseRelations(data),
  };
}

function codeMapPaths(codeMap: string): string[] {
  return codeMap.split("\n").flatMap((line) => {
    const path = CODE_MAP_PATH.exec(line)?.[1];
    return path && path.includes("/") ? [path] : [];
  });
}

export function isFinished(node: SpecNode): boolean {
  if (node.status === "done" || node.status === "good-enough" || node.status === "abandoned") return true;
  return node.phases.length > 0 && node.phases.every((phase) => phase.done);
}
