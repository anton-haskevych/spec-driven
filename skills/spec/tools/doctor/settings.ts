import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { parseFrontmatter } from "../core/frontmatter";
import { GATES_FILE } from "../playbook/gates";
import { parseSettings, SETTINGS_FILE } from "../playbook/settings";
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
  const named = Object.entries({ "after-merge-main": settings.gates.afterMergeMain, bootstrap: settings.gates.bootstrap })
    .flatMap(([key, name]) => (name ? [{ key, name }] : []));
  return [...problems.map((problem) => warning(file, problem)), ...gateNameIssues(file, named, gates)];
}

function gateNameIssues(file: string, named: ReadonlyArray<{ key: string; name: string }>, gates: Gates): Issue[] {
  if (named.length === 0) return [];
  if (!gates) return [error(file, `names gates (${named.map(({ name }) => name).join(", ")}) but ${GATES_FILE} does not exist`)];
  return named
    .filter(({ name }) => !gates.has(name.toLowerCase()))
    .map(({ key, name }) => error(file, `gates.${key}: ${name} is not defined in ${GATES_FILE}`));
}
