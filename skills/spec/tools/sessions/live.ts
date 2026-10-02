import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isRecord, numberField, stringField } from "../core/frontmatter";
import type { Result } from "../core/result";
import { parseJson } from "../pr/gh-records";
import { canonicalPath } from "../workspaces/list";

// The only reader of `<claudeHome>/sessions/*.json`, an undocumented Claude Code internal (ledger).
export interface LiveSession {
  pid: number;
  sessionId: string;
  cwd: string;
  status: "busy" | "idle";
  name?: string;
  updatedAt: Date;
  procStart: string;
}

export function defaultClaudeHome(env: Readonly<Record<string, string | undefined>> = process.env): string {
  return env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
}

export type ProcStarts = (pids: readonly number[]) => ReadonlyMap<number, string>;

export function parseSessionFile(text: string): LiveSession | undefined {
  const data = parseJson(text);
  if (!isRecord(data)) return undefined;
  const pid = numberField(data, "pid");
  const sessionId = stringField(data, "sessionId");
  const cwd = stringField(data, "cwd");
  const procStart = stringField(data, "procStart");
  const updatedAt = toDate(data.updatedAt) ?? toDate(data.startedAt);
  if (pid === undefined || !sessionId || !cwd || !procStart || !updatedAt) return undefined;
  const name = stringField(data, "name");
  return { pid, sessionId, cwd, status: stringField(data, "status") === "idle" ? "idle" : "busy", ...(name ? { name } : {}), updatedAt, procStart };
}

export function loadLiveSessions(claudeHome: string, procStarts: ProcStarts): Result<LiveSession[]> {
  const dir = join(claudeHome, "sessions");
  const files = sessionFiles(dir);
  if (!files.ok) return files;
  const sessions: LiveSession[] = [];
  for (const file of files.value) {
    const read = readSession(join(dir, file));
    if (read === "unreadable") return { ok: false, reason: `unreadable session file ${file}` };
    if (read) sessions.push(read);
  }
  if (sessions.length === 0) return { ok: true, value: [] };
  const starts = procStarts(sessions.map((session) => session.pid));
  const live = sessions.filter((session) => sameStart(starts.get(session.pid), session.procStart));
  return { ok: true, value: newestPerSession(live).map((session) => ({ ...session, cwd: canonicalPath(session.cwd) })) };
}

function sessionFiles(dir: string): Result<string[]> {
  if (!existsSync(dir)) return { ok: false, reason: `no ${dir}` };
  try {
    return { ok: true, value: readdirSync(dir).filter((name) => name.endsWith(".json")).sort() };
  } catch (cause) {
    return { ok: false, reason: cause instanceof Error ? cause.message : String(cause) };
  }
}

// A file may be mid-write when read; it gets one retry. A file gone by then was a session ending.
function readSession(path: string): LiveSession | "unreadable" | undefined {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!existsSync(path)) return undefined;
    const parsed = parseSessionFile(readFileSync(path, "utf8"));
    if (parsed) return parsed;
  }
  return "unreadable";
}

function sameStart(running: string | undefined, recorded: string): boolean {
  return running !== undefined && collapse(running) === collapse(recorded);
}

function collapse(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function newestPerSession(sessions: readonly LiveSession[]): LiveSession[] {
  const newest = new Map<string, LiveSession>();
  for (const session of sessions) {
    const seen = newest.get(session.sessionId);
    if (!seen || session.updatedAt > seen.updatedAt) newest.set(session.sessionId, session);
  }
  return [...newest.values()];
}

function toDate(value: unknown): Date | undefined {
  const date = typeof value === "number" ? new Date(value) : typeof value === "string" ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}
