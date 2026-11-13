import { isCardId, tagDocPath } from "../../cards/paths";
import { TAG_KINDS } from "../../cards/tag-doc";
import { spellingOf, type TagFields } from "../../cards/tags";
import { oneOf } from "../../core/read-fields";
import { PRIORITIES } from "../../core/schedule";
import type { PhaseDeps } from "../../plan/phase-writer";
import { parseFlags } from "../phase/args";
import { sendCardIntent } from "./send";

const NONE = "none";

// `card tag <id> <tag>… [--remove <tag>]…` tags a card; `card tag <tag> --kind … --priority … --summary …`
// sets the tag's own details.
export async function tagCommand(projectDir: string, args: readonly string[], deps: PhaseDeps, usage: string): Promise<string> {
  const parsed = parseFlags(args, { remove: { type: "string", multiple: true }, kind: { type: "string" }, priority: { type: "string" }, summary: { type: "string" } });
  const [first, ...names] = parsed?.positionals ?? [];
  if (!parsed || !first) return `usage: ${usage}`;
  const { values } = parsed;
  if (isCardId(first)) {
    const remove = values.remove ?? [];
    if (names.length === 0 && remove.length === 0) return `usage: ${usage}`;
    return sendCardIntent(projectDir, deps, "tag", () => ({ action: "tag", id: first, add: names, remove }));
  }
  if (names.length > 0) return `usage: ${usage}`;
  const fields = tagFields(values);
  if (typeof fields === "string") return `card tag: refused, nothing written. ${fields}`;
  if (Object.keys(fields).length === 0) return `usage: ${usage}`;
  return sendCardIntent(projectDir, deps, "tag", (view) => {
    const ifVersion = view.version(tagDocPath(spellingOf(view, first)));
    return { action: "tag-set", name: first, fields, ...(ifVersion ? { ifVersion } : {}) };
  });
}

function tagFields(values: { kind?: string; priority?: string; summary?: string }): TagFields | string {
  const problems: string[] = [];
  const kind = oneOf(values.kind, TAG_KINDS, "--kind", problems);
  const priority = values.priority === NONE ? null : oneOf(values.priority?.toLowerCase(), PRIORITIES, "--priority", problems);
  if (problems.length > 0) return problems.join("; ");
  const summary = values.summary === NONE ? null : values.summary;
  return Object.fromEntries(Object.entries({ kind, priority, summary }).filter(([, value]) => value !== undefined));
}
