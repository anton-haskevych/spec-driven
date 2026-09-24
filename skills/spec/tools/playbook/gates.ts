import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { outlineMarkdown } from "../core/markdown";

export const GATES_FILE = join("docs", "specs", "_playbook", "gates.md");
const GATE_REFERENCE = /^gate:\s*(.+)$/i;

export function parseGates(markdown: string): Map<string, string[]> {
  const gates = new Map<string, string[]>();
  for (const task of outlineMarkdown(markdown).tasks) {
    const name = task.section.toLowerCase();
    if (!name) continue;
    gates.set(name, [...(gates.get(name) ?? []), task.text]);
  }
  return gates;
}

export function referencedGates(prOpening: string): string[] {
  return outlineMarkdown(prOpening).tasks.flatMap((task) => {
    const names = GATE_REFERENCE.exec(task.text)?.[1];
    return names ? names.split(",").map((name) => name.trim().toLowerCase()).filter(Boolean) : [];
  });
}

export function loadGates(projectDir: string): Map<string, string[]> | undefined {
  const text = readTextIfExists(join(projectDir, GATES_FILE));
  return text === undefined ? undefined : parseGates(text);
}
