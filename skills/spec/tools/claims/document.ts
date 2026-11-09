import { isRecord } from "../core/frontmatter";
import type { Result } from "../core/result";
import { parseJson } from "../pr/gh-records";
import type { ClaudeSource, SessionRef } from "../runtime/sessions";
import type { SessionPhaseClaim } from "./snapshot-held";

export interface StoredSessionClaim extends SessionPhaseClaim {
  workspace: string;
  claimedAt: string;
  branch?: string;
  takenFrom?: SessionRef;
}

export interface ClaimDocument {
  claim: StoredSessionClaim;
  record: Readonly<Record<string, unknown>>;
}

const IDENTITY_ALIASES = ["runtime", "source", "version", "session", "sessionRef"];

export function decodeClaimDocument(text: string, legacySource?: ClaudeSource): Result<ClaimDocument> {
  const record = parseJson(text);
  if (!isRecord(record)) return { ok: false, reason: "claim is not a JSON object" };
  if (IDENTITY_ALIASES.some((key) => Object.hasOwn(record, key)))
    return { ok: false, reason: "unsupported claim identity or version fields" };
  const versioned = Object.hasOwn(record, "schemaVersion");
  if (versioned && record.schemaVersion !== 1) return { ok: false, reason: "unsupported claim schema version" };
  const ref = versioned ? sessionRef(record.ref) : legacyRef(record, legacySource);
  if (!ref) return { ok: false, reason: "claim requires a valid qualified identity or explicit legacy Claude source" };
  if (versioned && Object.hasOwn(record, "sessionId") && record.sessionId !== ref.id)
    return { ok: false, reason: "claim sessionId conflicts with qualified identity" };
  const fields = claimFields(record);
  if (!fields) return { ok: false, reason: "invalid claim fields" };
  const takenFrom = takeoverRef(record, versioned, legacySource);
  if (!takenFrom.ok) return takenFrom;
  return { ok: true, value: { record, claim: { ...fields, ref, ...(takenFrom.value ? { takenFrom: takenFrom.value } : {}) } } };
}

function claimFields(record: Record<string, unknown>): Omit<StoredSessionClaim, "ref" | "takenFrom"> | undefined {
  const { spec, phase, workspace, claimedAt, sessionName, branch } = record;
  if (!nonempty(spec) || !nonempty(phase) || !nonempty(workspace) || !nonempty(claimedAt)) return undefined;
  if (Object.hasOwn(record, "sessionName") && !nonempty(sessionName)) return undefined;
  if (Object.hasOwn(record, "branch") && !nonempty(branch)) return undefined;
  return { spec, phase, workspace, claimedAt, ...(nonempty(sessionName) ? { sessionName } : {}), ...(nonempty(branch) ? { branch } : {}) };
}

function legacyRef(record: Record<string, unknown>, source?: ClaudeSource): SessionRef | undefined {
  if (Object.hasOwn(record, "ref") || source?.runtime !== "claude" || !nonempty(source.key) || !nonempty(record.sessionId)) return undefined;
  return { source: { runtime: "claude", key: source.key }, id: record.sessionId };
}

function takeoverRef(record: Record<string, unknown>, versioned: boolean, source?: ClaudeSource): Result<SessionRef | undefined> {
  if (!Object.hasOwn(record, "takenFrom")) return { ok: true, value: undefined };
  const ref = versioned ? sessionRef(record.takenFrom) : legacyRef({ sessionId: record.takenFrom }, source);
  return ref ? { ok: true, value: ref } : { ok: false, reason: "invalid claim takeover identity" };
}

function sessionRef(value: unknown): SessionRef | undefined {
  if (!isRecord(value) || !isRecord(value.source) || !nonempty(value.id) || !nonempty(value.source.key)) return undefined;
  const { runtime, key } = value.source;
  if (runtime !== "claude" && runtime !== "codex") return undefined;
  return { source: { runtime, key }, id: value.id };
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}
