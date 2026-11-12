import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isRecord, numberField, stringField } from "../core/frontmatter";
import type { Result } from "../core/result";
import { parseJson } from "../pr/gh-records";
import { canonicalPath } from "../workspaces/list";
import type { NameSource, SessionStatus } from "../runtime/sessions";

export type { SessionStatus, NameSource } from "../runtime/sessions";

// The only reader of `<claudeHome>/sessions/*.json`, an undocumented Claude Code internal (ledger).
export interface LiveSession {
  pid: number;
  sessionId: string;
  cwd: string;
  // "shell": the turn is over but a background shell still runs, e.g. a local stack left up for the next phase.
  status: SessionStatus;
  name?: string;
  nameSource?: NameSource;
  updatedAt: Date;
  // "startedAt": the file had no `updatedAt`, so the last status change is unknown.
  updatedFrom: "updatedAt" | "startedAt";
  procStart: string;
  // Set on a tab sent to the background: the conversation goes on as this job (its session id starts with it).
  parkedJobId?: string;
  // The folder the session was launched in, where its project hooks run, wherever it works now; unset when unknown.
  startDir?: string;
}

export function defaultClaudeHome(env: Readonly<Record<string, string | undefined>> = process.env): string {
  return env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
}

// Each pid's start time in every form this platform records it in.
export type ProcStarts = (pids: readonly number[]) => ReadonlyMap<number, string | readonly string[]>;
export type StartDirs = (pids: readonly number[]) => ReadonlyMap<number, string>;

export function parseSessionFile(text: string): LiveSession | undefined {
  const data = parseJson(text);
  if (!isRecord(data)) return undefined;
  const pid = numberField(data, "pid");
  const sessionId = stringField(data, "sessionId");
  const cwd = stringField(data, "cwd");
  const procStart = stringField(data, "procStart");
  const updated = toDate(data.updatedAt);
  const updatedAt = updated ?? toDate(data.startedAt);
  if (pid === undefined || !sessionId || !cwd || !procStart || !updatedAt) return undefined;
  const name = stringField(data, "name");
  const nameSource = toNameSource(stringField(data, "nameSource"));
  const parkedJobId = stringField(data, "parkedJobId");
  return {
    pid,
    sessionId,
    cwd,
    // A tab sent to the background keeps its process and this file, frozen at its last status; the
    // conversation goes on under a new session id, as the job with its own file.
    status: parkedJobId ? "idle" : toSessionStatus(stringField(data, "status")),
    ...(name ? { name } : {}),
    ...(nameSource ? { nameSource } : {}),
    updatedAt,
    updatedFrom: updated ? "updatedAt" : "startedAt",
    procStart,
    ...(parkedJobId ? { parkedJobId } : {}),
  };
}

export function loadLiveSessions(claudeHome: string, procStarts: ProcStarts, startDirs: StartDirs = () => new Map()): Result<LiveSession[]> {
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
  const newest = newestPerSession(live);
  const dirs = startDirs(newest.map((session) => session.pid));
  return { ok: true, value: newest.map((session) => withPaths(session, dirs.get(session.pid))) };
}

function withPaths(session: LiveSession, startDir: string | undefined): LiveSession {
  return { ...session, cwd: canonicalPath(session.cwd), ...(startDir ? { startDir: canonicalPath(startDir) } : {}) };
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

function sameStart(running: string | readonly string[] | undefined, recorded: string): boolean {
  const forms = running === undefined ? [] : typeof running === "string" ? [running] : running;
  return forms.some((form) => collapse(form) === collapse(recorded));
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

// A value this reader doesn't know yet counts as busy: an unknown state never frees a tree.
function toSessionStatus(value: string | undefined): SessionStatus {
  return value === "idle" || value === "shell" ? value : "busy";
}

function toNameSource(value: string | undefined): NameSource | undefined {
  return value === "user" || value === "derived" ? value : undefined;
}

function toDate(value: unknown): Date | undefined {
  const date = typeof value === "number" ? new Date(value) : typeof value === "string" ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}
