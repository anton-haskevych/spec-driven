import { landSpecField, type SpecFieldEdit } from "../core/land-spec-field";
import { systemRunner, type Runner } from "../core/run";
import { allowedStatuses } from "../core/taxonomy";
import { fieldLine, systemFieldDeps, writeJoinedField, type FieldWriteDeps } from "./spec-field-write";

export const SPEC_STATUS_USAGE = "spec-status <spec> <status>";

// `status:` in CLAUDE.md for a spec in files, the record for a joined one. `/spec status` is a mode, hence the name.
export async function specStatusCommand(projectDir: string, args: readonly string[], runner: Runner = systemRunner, deps: FieldWriteDeps = systemFieldDeps(runner)): Promise<string> {
  const [spec, value, ...extra] = args;
  if (spec === undefined || value === undefined || extra.length > 0) return `usage: ${SPEC_STATUS_USAGE}`;
  const allowed = allowedStatuses(projectDir);
  if (allowed.length > 0 && !allowed.includes(value)) return `spec-status: ${value} is not a status here; use ${allowed.join(", ")}`;
  const edit: SpecFieldEdit = { spec, key: "status", value, same: (current) => current === value, already: `${spec} is already ${value}`, message: `[status] ${spec} ${value}` };
  const landed = (sha: string) => `spec-status: ${spec} is ${value} (${sha})`;
  const joined = await writeJoinedField(projectDir, { spec, key: "status", value }, deps);
  if (joined) return fieldLine("spec-status", joined, landed, edit.already);
  const outcome = await landSpecField(projectDir, runner, edit);
  return outcome.kind === "landed" ? landed(outcome.sha.slice(0, 7)) : `spec-status: ${outcome.reason}`;
}
