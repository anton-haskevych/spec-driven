import type { Env } from "../core/env";
import type { FrontmatterData } from "../core/frontmatter";
import { count, oneOf, optionalText, requiredText, withoutUndefined } from "../core/read-fields";
import { readObject, type DocRead } from "../plan/docs/read";
import { sessionKey } from "../runtime/identity";
import type { ClaudeSource, SessionRef } from "../runtime/sessions";
import { ownSessionId } from "./own";

export const SESSION_MODES = ["prep", "create", "review", "execute", "babysit", "overseer"] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

// Every Claude session shares one source; its id makes each document its own file. codex-runtime-support 2b
// may bind a real key later, and a document under the old one ages out (sessions/stamp.ts).
export const CLAUDE_CODE_SOURCE: ClaudeSource = { runtime: "claude", key: "claude-code" };

// Who is working where, in which mode. What a session holds stays its claim; the board joins the two by id.
export interface SessionDoc {
  ref: SessionRef;
  who: string;
  host: string;
  tree: string;
  mode: SessionMode;
  lastWriteAt: string;
  spec?: string;
  branch?: string;
  title?: string;
  planVersion?: number;
  // Commits on no remote ref, and uncommitted paths, in the session's tree when it last wrote.
  ahead?: number;
  edited?: number;
}

const WRITE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;

export function claudeSessionRef(env: Env): SessionRef | undefined {
  const id = ownSessionId(env);
  return id ? { source: CLAUDE_CODE_SOURCE, id } : undefined;
}

// The key is JSON, which a record path can't hold: base64url keeps it legal and one-to-one.
export function sessionSlug(ref: SessionRef): string {
  return Buffer.from(sessionKey(ref)).toString("base64url");
}

export function sessionDocPath(ref: SessionRef): string {
  return `${SESSIONS_FOLDER}${sessionSlug(ref)}.json`;
}

export const SESSIONS_FOLDER = "sessions/";

export function readSessionDoc(value: unknown): DocRead<SessionDoc> {
  return readObject(value, "session", readSessionFields);
}

function readSessionFields(fields: FrontmatterData, problems: string[]): SessionDoc {
  return withoutUndefined({
    ref: readRef(fields.ref, problems),
    who: requiredText(fields.who, "who", problems) ?? "",
    host: requiredText(fields.host, "host", problems) ?? "",
    tree: requiredText(fields.tree, "tree", problems) ?? "",
    mode: oneOf(fields.mode, SESSION_MODES, "mode", problems) ?? missingMode(fields.mode, problems),
    lastWriteAt: writeTime(fields.lastWriteAt, problems),
    spec: optionalText(fields.spec, "spec", problems),
    branch: optionalText(fields.branch, "branch", problems),
    title: optionalText(fields.title, "title", problems),
    planVersion: count(fields.planVersion, "planVersion", problems),
    ahead: count(fields.ahead, "ahead", problems),
    edited: count(fields.edited, "edited", problems),
  });
}

function readRef(value: unknown, problems: string[]): SessionRef {
  const ref = sessionRefOf(value);
  if (ref) return ref;
  problems.push("ref must be a session reference: { source: { runtime, key }, id }");
  return { source: CLAUDE_CODE_SOURCE, id: "" };
}

function sessionRefOf(value: unknown): SessionRef | undefined {
  if (!isObject(value) || !isObject(value.source)) return undefined;
  const { runtime, key } = value.source;
  if ((runtime !== "claude" && runtime !== "codex") || !text(key) || !text(value.id)) return undefined;
  return { source: { runtime, key }, id: value.id };
}

function missingMode(value: unknown, problems: string[]): SessionMode {
  if (value === undefined) problems.push(`mode must be ${SESSION_MODES.slice(0, -1).join(", ")} or ${SESSION_MODES.at(-1)}`);
  return "execute";
}

function writeTime(value: unknown, problems: string[]): string {
  if (typeof value === "string" && WRITE_TIME.test(value)) return value;
  problems.push("lastWriteAt must be a time like 2026-11-13T10:00:00-08:00");
  return "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}
