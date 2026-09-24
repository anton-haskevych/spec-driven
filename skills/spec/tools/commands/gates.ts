import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { findSpecs } from "../core/spec-folders";
import { GATES_FILE, loadGates, referencedGates } from "../playbook/gates";

export function gatesReport(projectDir: string, specName: string | undefined): string {
  if (!specName) return "usage: gates <spec-name>";
  const [spec] = findSpecs(projectDir, specName);
  if (!spec) return `gates: no spec named ${specName}`;

  const names = referencedGates(readTextIfExists(join(spec.dir, "pr-opening.md")) ?? "");
  if (names.length === 0) return "pr-opening.md references no gate; run the checks it lists.";
  const gates = loadGates(projectDir);
  if (!gates) return `pr-opening.md references ${names.join(", ")}, but ${GATES_FILE} does not exist.`;

  return names
    .map((name) => {
      const checks = gates.get(name);
      if (!checks) return `## gate: ${name}\n(not defined in ${GATES_FILE}; known gates: ${[...gates.keys()].join(", ")})`;
      return `## gate: ${name}\n${checks.map((check) => `- [ ] ${check}`).join("\n")}`;
    })
    .join("\n\n");
}
