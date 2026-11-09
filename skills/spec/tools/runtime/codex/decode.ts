import { isAbsolute } from "node:path";
import { isRecord } from "../../core/frontmatter";
import type { Result } from "../../core/result";
import type { CodexSource, RuntimeSession } from "../sessions";

export interface LoadedPage {
  ids: string[];
  next?: string;
}

export function loadedPage(value: unknown): Result<LoadedPage> {
  if (!isRecord(value) || !Array.isArray(value.data) || !value.data.every((id) => typeof id === "string" && id.length > 0)) {
    return { ok: false, reason: "invalid Codex loaded page" };
  }
  if (value.nextCursor !== null && value.nextCursor !== undefined && (typeof value.nextCursor !== "string" || !value.nextCursor)) {
    return { ok: false, reason: "invalid Codex page cursor" };
  }
  return { ok: true, value: { ids: value.data, ...(typeof value.nextCursor === "string" ? { next: value.nextCursor } : {}) } };
}

export function codexSession(value: unknown, expectedId: string, source: CodexSource, observedAt: string): Result<RuntimeSession> {
  const t = isRecord(value) && isRecord(value.thread) ? value.thread : undefined;
  if (!t || t.id !== expectedId || typeof t.cwd !== "string" || !isAbsolute(t.cwd) || typeof t.updatedAt !== "number") {
    return { ok: false, reason: "invalid Codex thread metadata" };
  }
  const changedAt = new Date(t.updatedAt * 1000);
  if (!Number.isFinite(changedAt.getTime())) return { ok: false, reason: "invalid Codex thread timestamp" };
  const state = threadState(t.status);
  if (!state.ok) return state;
  return { ok: true, value: {
    ref: { source, id: expectedId }, cwd: t.cwd, ...state.value, observedAt,
    changedAt: changedAt.toISOString(), changedFrom: "updatedAt",
    ...(typeof t.name === "string" && t.name ? { name: t.name } : {}),
  } };
}

function threadState(value: unknown): Result<Pick<RuntimeSession, "status" | "attention">> {
  if (!isRecord(value)) return { ok: false, reason: "missing Codex thread status" };
  if (value.type === "idle") return { ok: true, value: { status: "idle" } };
  if (value.type === "systemError") return { ok: true, value: { status: "busy", attention: "error" } };
  if (value.type !== "active" || !Array.isArray(value.activeFlags)) return { ok: false, reason: "unknown or unloaded Codex thread state" };
  if (!value.activeFlags.every((flag) => flag === "waitingOnApproval" || flag === "waitingOnUserInput")) {
    return { ok: false, reason: "unknown Codex attention flag" };
  }
  const attention = value.activeFlags.includes("waitingOnApproval") ? "approval" : value.activeFlags.includes("waitingOnUserInput") ? "input" : undefined;
  return { ok: true, value: { status: "busy", ...(attention ? { attention } : {}) } };
}
