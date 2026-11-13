import { isPlainObject } from "../../record/document";
import type { RecordPlan } from "../../record/write";
import { readSpecDoc, type SpecDoc } from "../docs/spec-doc";
import { specDocPath } from "../kinds";

export const SPEC_FIELD_KEYS = ["status", "owner", "focus", "ship"] as const;
export type SpecFieldKey = (typeof SPEC_FIELD_KEYS)[number];

// `null` clears the field. Focus keeps its command's rules: add only out of focus, move and drop only in it.
export interface FieldIntent {
  spec: string;
  key: SpecFieldKey;
  value: string | null;
  focus?: "add" | "move" | "drop";
}

export const FIELD_COMMAND = "field";

export function fieldPlan(intent: FieldIntent): RecordPlan {
  return (view) => {
    const spec = readSpecDoc(view.doc(specDocPath(intent.spec))).doc;
    if (!spec) return { refused: `${intent.spec} is not on the board` };
    const current = spec[intent.key];
    const refusal = intent.focus ? focusRefusal(intent, spec) : undefined;
    if (refusal) return { refused: refusal };
    if ((current ?? null) === intent.value) return { unchanged: true };
    return { ops: [{ op: "update", path: specDocPath(intent.spec), patch: { [intent.key]: intent.value } }], message: `record: ${intent.key} ${intent.spec} ${intent.value ?? "none"}` };
  };
}

function focusRefusal({ spec, focus, value }: FieldIntent, doc: SpecDoc): string | undefined {
  if (focus === "add" && doc.focus) return `${spec} is already in focus (${doc.focus}); use move`;
  if ((focus === "move" || focus === "drop") && !doc.focus) return `${spec} is not in focus`;
  if (focus === "move" && doc.focus === value) return `${spec} is already ${value}`;
  return undefined;
}

export function readFieldIntent(args: unknown): FieldIntent | undefined {
  if (!isPlainObject(args)) return undefined;
  const { spec, key, value, focus } = args;
  if (typeof spec !== "string" || !SPEC_FIELD_KEYS.includes(key as SpecFieldKey)) return undefined;
  if (value !== null && typeof value !== "string") return undefined;
  if (focus !== undefined && focus !== "add" && focus !== "move" && focus !== "drop") return undefined;
  return { spec, key: key as SpecFieldKey, value, ...(focus ? { focus } : {}) };
}
