import { join } from "node:path";
import { parseArgs } from "node:util";
import { readTextIfExists } from "../core/files";
import { findSpecs } from "../core/spec-folders";
import { GATES_FILE, loadGates, referencedGates } from "../playbook/gates";

export const GATES_USAGE = "gates <spec-name> | gates --name <gate…>";

export function gatesReport(projectDir: string, args: readonly string[]): string {
  const parsed = parseGateArgs(args);
  if (!parsed || parsed.positionals.length === 0) return `usage: ${GATES_USAGE}`;
  const names = parsed.values.name ? parsed.positionals.map((name) => name.toLowerCase()) : undefined;
  return names ? namedGates(projectDir, names) : specGates(projectDir, parsed.positionals[0] ?? "");
}

function specGates(projectDir: string, specName: string): string {
  const [spec] = findSpecs(projectDir, specName);
  if (!spec) return `gates: no spec named ${specName}`;
  const names = referencedGates(readTextIfExists(join(spec.dir, "pr-opening.md")) ?? "");
  if (names.length === 0) return "pr-opening.md references no gate; run the checks it lists.";
  const gates = loadGates(projectDir);
  if (!gates) return `pr-opening.md references ${names.join(", ")}, but ${GATES_FILE} does not exist.`;
  return renderGates(names, gates);
}

function namedGates(projectDir: string, names: readonly string[]): string {
  const gates = loadGates(projectDir);
  return gates ? renderGates(names, gates) : `${GATES_FILE} does not exist.`;
}

function renderGates(names: readonly string[], gates: ReadonlyMap<string, string[]>): string {
  return names
    .map((name) => {
      const checks = gates.get(name);
      if (!checks) return `## gate: ${name}\n(not defined in ${GATES_FILE}; known gates: ${[...gates.keys()].join(", ")})`;
      return `## gate: ${name}\n${checks.map((check) => `- [ ] ${check}`).join("\n")}`;
    })
    .join("\n\n");
}

function parseGateArgs(args: readonly string[]) {
  try {
    return parseArgs({ args: [...args], options: { name: { type: "boolean" } }, allowPositionals: true, strict: true });
  } catch {
    return undefined;
  }
}
