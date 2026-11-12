import type { FileChange } from "../core/land-on-ref";
import { blobVersion, mergePatch, serializeDoc } from "./document";
import { META_PATH } from "./layout";
import type { RecordView } from "./view";

export type RecordOp =
  | { op: "create"; path: string; doc: unknown }
  | { op: "update"; path: string; patch: Record<string, unknown>; ifVersion?: string }
  | { op: "replace"; path: string; doc: unknown; ifVersion?: string }
  | { op: "delete"; path: string; ifVersion?: string };

export type Validate = (path: string, doc: unknown) => string[];

// A conflict with no `current` means the document was deleted under the caller.
export type Conflict = { kind: "conflict"; path: string; current?: unknown; currentVersion?: string };

export type PlannedWrites = { kind: "planned"; changes: FileChange[]; versions: Record<string, string> } | Conflict | { kind: "invalid"; problems: string[] };

type OpOutcome = { kind: "write"; text: string | undefined } | { kind: "same" } | Conflict | { kind: "invalid"; problem: string };

export const MAX_OPS = 50;
const RECORD_PATH = /^(?:[A-Za-z0-9][A-Za-z0-9._-]*\/)*[A-Za-z0-9][A-Za-z0-9._-]*\.json$/;

export function planWrites(view: RecordView, ops: readonly RecordOp[], validate: Validate): PlannedWrites {
  const shapeProblems = batchProblems(ops);
  if (shapeProblems.length > 0) return { kind: "invalid", problems: shapeProblems };

  const changes: FileChange[] = [];
  const versions: Record<string, string> = {};
  const problems: string[] = [];
  for (const op of ops) {
    const outcome = planOp(view, op, validate);
    if (outcome.kind === "conflict") return outcome;
    if (outcome.kind === "invalid") problems.push(outcome.problem);
    if (outcome.kind !== "write") continue;
    changes.push({ path: op.path, text: outcome.text });
    if (outcome.text !== undefined) versions[op.path] = blobVersion(outcome.text);
  }
  return problems.length > 0 ? { kind: "invalid", problems } : { kind: "planned", changes, versions };
}

function batchProblems(ops: readonly RecordOp[]): string[] {
  if (ops.length > MAX_OPS) return [`one write takes at most ${MAX_OPS} changes; got ${ops.length}`];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const { path } of ops) {
    if (seen.has(path)) problems.push(`${path} appears twice in one write`);
    else if (path === META_PATH) problems.push(`${META_PATH} is the store's own; no write may change it`);
    else if (!RECORD_PATH.test(path)) problems.push(`${path} is not a record path (folders/name.json, letters, digits, . _ -)`);
    seen.add(path);
  }
  return problems;
}

function planOp(view: RecordView, op: RecordOp, validate: Validate): OpOutcome {
  const currentVersion = view.version(op.path);
  const current = currentVersion === undefined ? undefined : view.doc(op.path);
  const conflict: Conflict = currentVersion === undefined ? { kind: "conflict", path: op.path } : { kind: "conflict", path: op.path, current, currentVersion };
  if (op.op === "create") return currentVersion === undefined ? planned(op.path, op.doc, undefined, validate) : conflict;
  if (op.ifVersion !== undefined && op.ifVersion !== currentVersion) return conflict;
  if (op.op === "replace") return planned(op.path, op.doc, currentVersion, validate);
  if (currentVersion === undefined) return { kind: "invalid", problem: `${op.path} does not exist` };
  if (op.op === "delete") return { kind: "write", text: undefined };
  if (current === undefined) return { kind: "invalid", problem: `${op.path} is not valid JSON; replace it whole` };
  return planned(op.path, mergePatch(current, op.patch), currentVersion, validate);
}

function planned(path: string, doc: unknown, currentVersion: string | undefined, validate: Validate): OpOutcome {
  const problems = validate(path, doc);
  if (problems.length > 0) return { kind: "invalid", problem: problems.join("; ") };
  const text = serializeDoc(doc);
  return blobVersion(text) === currentVersion ? { kind: "same" } : { kind: "write", text };
}
