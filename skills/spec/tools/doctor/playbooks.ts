import { join } from "node:path";
import { markdownFilesIn, readTextIfExists } from "../core/files";
import { isRecord, parseFrontmatter, stringList } from "../core/frontmatter";
import type { SpecState } from "../core/spec-state";
import { projectFieldValues } from "../core/taxonomy";
import { PLAYBOOK_DIR } from "../playbook/playbooks";
import { error, warning, type Issue } from "./issue";

export type TaxonomyValues = (field: string) => readonly string[];

const LINE_LIMIT = 60;

export function playbookIssues(projectDir: string): Issue[] {
  const dir = join(projectDir, PLAYBOOK_DIR);
  const taxonomy = (field: string) => projectFieldValues(projectDir, field);
  return markdownFilesIn(dir).flatMap((name) => checkPlaybook(join(dir, name), readTextIfExists(join(dir, name)) ?? "", taxonomy));
}

export function checkPlaybook(file: string, text: string, taxonomy: TaxonomyValues): Issue[] {
  const parsed = parseFrontmatter(text);
  if (parsed.kind === "none") return [];
  if (parsed.kind === "invalid") return [error(file, parsed.error)];
  const match = parsed.data.match;
  if (match === undefined) return [];
  if (!isRecord(match)) return [error(file, "match must map taxonomy fields to values, e.g. match: { domain: [growth] }")];
  if (Object.keys(match).length === 0) return [warning(file, "match is empty, so this playbook applies to no spec")];

  const unknown = Object.keys(match).flatMap((field) => {
    const known = taxonomy(field);
    if (known.length === 0) return [];
    return stringList(match, field)
      .filter((value) => !known.includes(value))
      .map((value) => warning(file, `match ${field}: "${value}" is not a ${field} value in .claude/taxonomy.md`));
  });
  const lines = parsed.body.trim().split("\n").length;
  const tooLong = lines > LINE_LIMIT
    ? [warning(file, `playbook is ${lines} lines; keep it under ${LINE_LIMIT} and move depth into the skill it points to`)]
    : [];
  return [...unknown, ...tooLong];
}

export function phasePlaybookIssues(state: SpecState, known: ReadonlySet<string>, onlyPointer?: string): Issue[] {
  return state.phases
    .filter((phase) => phase.playbook && !known.has(phase.playbook) && (!onlyPointer || phase.pointer === onlyPointer))
    .map((phase) => {
      const names = known.size > 0 ? [...known].join(", ") : "none";
      return error(join(state.spec.dir, phase.pointer), `playbook: ${phase.playbook} is not in docs/specs/_playbook/ (known: ${names})`);
    });
}
