import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { isRecord, parseFrontmatter } from "../core/frontmatter";
import { GATE_KINDS } from "../core/gate";
import { GATES_FILE } from "../playbook/gates";
import { parseSettings, selfApproveKinds, SETTINGS_FILE } from "../playbook/settings";
import { error, warning, type Issue } from "./issue";

type Gates = ReadonlyMap<string, string[]> | undefined;

export function settingsFileIssues(projectDir: string, gates: Gates): Issue[] {
  const file = join(projectDir, SETTINGS_FILE);
  const text = readTextIfExists(file);
  return text === undefined ? [] : checkSettings(file, text, gates);
}

export function checkSettings(file: string, text: string, gates: Gates): Issue[] {
  const frontmatter = parseFrontmatter(text);
  if (frontmatter.kind === "invalid") return [error(file, frontmatter.error)];
  const { settings, problems } = parseSettings(text);
  const { afterMergeMain, bootstrap, perCommit, ciTriage } = settings.gates;
  const gateKeys = {
    "gates.after-merge-main": afterMergeMain,
    "gates.bootstrap": bootstrap,
    "gates.per-commit": perCommit,
    "gates.ci-triage": ciTriage,
    "deploy.gate": settings.deploy?.gate,
  };
  const named = Object.entries(gateKeys).flatMap(([key, name]) => (name ? [{ key, name }] : []));
  const crew = frontmatter.kind === "ok" ? frontmatter.data.crew : undefined;
  return [...problems.map((problem) => warning(file, problem)), ...gateNameIssues(file, named, gates), ...selfApproveIssues(file, crew)];
}

// A misspelt kind would make a gate the user meant to wave through park instead, silently.
function selfApproveIssues(file: string, crew: unknown): Issue[] {
  const raw = isRecord(crew) ? crew["self-approve"] : undefined;
  const words = Array.isArray(raw) ? raw.filter((word): word is string => typeof word === "string") : [];
  return selfApproveKinds(words).unknown.map((word) => error(file, `crew.self-approve: ${word} is not a gate kind (${GATE_KINDS.join(" or ")})`));
}

function gateNameIssues(file: string, named: ReadonlyArray<{ key: string; name: string }>, gates: Gates): Issue[] {
  if (named.length === 0) return [];
  if (!gates) return [error(file, `names gates (${named.map(({ name }) => name).join(", ")}) but ${GATES_FILE} does not exist`)];
  return named
    .filter(({ name }) => !gates.has(name.toLowerCase()))
    .map(({ key, name }) => error(file, `${key}: ${name} is not defined in ${GATES_FILE}`));
}
