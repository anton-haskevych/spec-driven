import { parseArgs } from "node:util";
import { gitAt, runnerName } from "../core/git";
import { landSpecField, type SpecFieldEdit } from "../core/land-spec-field";
import { hasMatchKey } from "../core/people";
import type { Result } from "../core/result";
import { systemRunner, type Runner } from "../core/run";

export type OwnerWho = { kind: "me" } | { kind: "none" } | { kind: "name"; name: string };

export interface OwnerRequest {
  spec: string;
  who: OwnerWho;
}

const OWNER_KEY = "owner";

export const OWNER_USAGE = "owner <spec> <name|me|none>";

export function parseOwnerArgs(args: readonly string[]): OwnerRequest | string {
  const [spec, word, ...extra] = positionals(args) ?? [];
  if (spec === undefined || word === undefined || extra.length > 0) return `usage: ${OWNER_USAGE}`;
  const keyword = word.trim().toLowerCase();
  if (keyword === "me" || keyword === "none") return { spec, who: { kind: keyword } };
  if (!hasMatchKey(word)) return `owner: "${word}" is too short to match anyone; use at least 3 letters of their name`;
  return { spec, who: { kind: "name", name: word.trim() } };
}

// Changes main for the whole team: runs only on someone's word that the spec is theirs, or nobody's.
export async function ownerCommand(projectDir: string, args: readonly string[], runner: Runner = systemRunner): Promise<string> {
  const request = parseOwnerArgs(args);
  if (typeof request === "string") return request;
  const owner = resolveOwner(request.who, () => runnerName(gitAt(projectDir, runner)));
  if (!owner.ok) return `owner: ${owner.reason}, or name the person`;
  const outcome = await landSpecField(projectDir, runner, ownerEdit(request.spec, owner.value));
  if (outcome.kind !== "landed") return `owner: ${outcome.reason}`;
  return `owner: ${request.spec} ${owner.value === undefined ? "has no owner" : `is ${owner.value}`} (${outcome.sha.slice(0, 7)})`;
}

function resolveOwner(who: OwnerWho, me: () => Result<string>): Result<string | undefined> {
  if (who.kind === "me") return me();
  return { ok: true, value: who.kind === "name" ? who.name : undefined };
}

function ownerEdit(spec: string, owner: string | undefined): SpecFieldEdit {
  if (owner === undefined) return { spec, key: OWNER_KEY, same: (current) => current === undefined, already: `${spec} already has no owner`, message: `[owner] ${spec} none` };
  return { spec, key: OWNER_KEY, value: owner, same: (current) => current === owner, already: `${spec} is already ${owner}`, message: `[owner] ${spec} ${owner}` };
}

function positionals(args: readonly string[]): string[] | undefined {
  try {
    return parseArgs({ args: [...args], options: {}, allowPositionals: true, strict: true }).positionals;
  } catch {
    return undefined;
  }
}
