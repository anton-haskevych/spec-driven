import { GATES_FILE, referencedGates } from "../playbook/gates";
import { error, type Issue } from "./issue";

export function gateIssues(prOpeningFile: string, prOpening: string, gates: ReadonlyMap<string, string[]> | undefined): Issue[] {
  const names = referencedGates(prOpening);
  if (names.length === 0) return [];
  if (!gates) return [error(prOpeningFile, `references gates (${names.join(", ")}) but ${GATES_FILE} does not exist`)];
  return names.filter((name) => !gates.has(name)).map((name) => error(prOpeningFile, `gate: ${name} is not defined in ${GATES_FILE}`));
}
