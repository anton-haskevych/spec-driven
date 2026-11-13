import { cardDocPath } from "../../cards/paths";
import { resolveAssignee } from "../../cards/people";
import type { CardFields } from "../../cards/plans";
import { SOURCE_ROLES, type SourceRole } from "../../cards/source-doc";
import { oneOf } from "../../core/read-fields";
import type { PhaseDeps } from "../../plan/phase-writer";
import { loadSettings } from "../../playbook/settings";
import { cardFlags, choices, originOf, type CardFlags } from "./flags";
import { refusedLine, sendCardIntent } from "./send";

const NONE = "none";
const OPEN_STATUSES = ["open", "doing"] as const;

// `card update <id> --priority p0 --due none …`: `none` removes a field.
export async function updateCard(projectDir: string, args: readonly string[], deps: PhaseDeps, usage: string): Promise<string> {
  const flags = cardFlags(args);
  const id = flags?.positionals[0];
  if (!flags || flags.positionals.length !== 1 || !id) return `usage: ${usage}`;
  const fields = fieldsOf(flags, loadSettings(projectDir).board.people);
  if (typeof fields === "string") return refusedLine("update", fields);
  if (Object.keys(fields).length === 0) return `usage: ${usage}`;
  const named = flags.values["if-version"];
  return sendCardIntent(projectDir, deps, "update", (view) => {
    const ifVersion = named ?? view.version(cardDocPath(id));
    return { action: "update", id, fields, ...(ifVersion ? { ifVersion } : {}) };
  });
}

// `card source <id> --quote … --app … [--role mention|evidence|origin]`
export async function addSource(projectDir: string, args: readonly string[], deps: PhaseDeps, usage: string): Promise<string> {
  const flags = cardFlags(args);
  const card = flags?.positionals[0];
  if (!flags || flags.positionals.length !== 1 || !card) return `usage: ${usage}`;
  const problems: string[] = [];
  const role: SourceRole = oneOf(flags.values.role, SOURCE_ROLES, "--role", problems) ?? "mention";
  if (problems.length > 0) return refusedLine("source", problems.join("; "));
  const origin = originOf(flags, deps);
  if (typeof origin === "string") return refusedLine("source", origin);
  return sendCardIntent(projectDir, deps, "source", () => ({ action: "source", source: { card, role, ...origin } }));
}

function fieldsOf(flags: CardFlags, people: readonly string[]): CardFields | string {
  const { values } = flags;
  const chosen = choices({ ...values, priority: values.priority === NONE ? undefined : values.priority });
  if (typeof chosen === "string") return chosen;
  const problems: string[] = [];
  const status = oneOf(values.status, OPEN_STATUSES, "--status (close and drop end a card)", problems);
  if (problems.length > 0) return problems.join("; ");
  const assignee = values.assignee === undefined || values.assignee === NONE ? values.assignee : resolveAssignee(values.assignee, people);
  if (typeof assignee === "object" && "refused" in assignee) return assignee.refused;
  return withoutUnset({
    title: values.title,
    commitment: chosen.commitment,
    status,
    priority: values.priority === NONE ? null : chosen.priority,
    due: removable(values.due),
    assignee: typeof assignee === "object" ? assignee.name : removable(assignee),
    note: removable(values.note),
  });
}

function removable(value: string | undefined): string | null | undefined {
  return value === NONE ? null : value;
}

function withoutUnset(fields: CardFields): CardFields {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}
