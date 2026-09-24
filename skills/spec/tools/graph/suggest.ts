import { join } from "node:path";
import { markdownFilesIn, readTextIfExists } from "../core/files";
import type { SpecNode } from "./nodes";

export interface ProseMention {
  other: string;
  file: string;
  line: string;
}

const MENTION = /(?:docs\/specs\/|`)([a-z0-9][a-z0-9-]+[a-z0-9])(?:[/`#]|$)/g;
const TOP_FILES = ["CLAUDE.md", "design.md", "technical.md", "progress.md", "code-map.md", "pr-opening.md", "in-flight.md"];
const LINE_LIMIT = 160;

export function undeclaredMentions(nodes: ReadonlyMap<string, SpecNode>, name: string): ProseMention[] {
  const node = nodes.get(name);
  if (!node) return [];
  const declared = new Set([name, ...node.relations.map((relation) => relation.target)]);
  const found = new Map<string, ProseMention>();

  for (const file of specProseFiles(node.spec.dir)) {
    const text = readTextIfExists(join(node.spec.dir, file)) ?? "";
    for (const line of text.split("\n")) {
      for (const match of line.matchAll(MENTION)) {
        const other = match[1] ?? "";
        if (!nodes.has(other) || declared.has(other) || found.has(other)) continue;
        found.set(other, { other, file, line: line.trim().slice(0, LINE_LIMIT) });
      }
    }
  }
  return [...found.values()];
}

function specProseFiles(dir: string): string[] {
  const phases = markdownFilesIn(join(dir, "phases")).map((name) => join("phases", name));
  return [...TOP_FILES, ...phases];
}
