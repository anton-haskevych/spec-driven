export type RuntimeId = "claude" | "codex";
export type SessionStatus = "busy" | "idle" | "shell";
export type NameSource = "user" | "derived";

export interface SourceRef {
  runtime: RuntimeId;
  key: string;
}

export type ClaudeSource = SourceRef & { runtime: "claude" };
export type CodexSource = SourceRef & { runtime: "codex" };

export interface SessionRef {
  source: SourceRef;
  id: string;
}

export type SourceCoverage =
  | { source: SourceRef; state: "complete" | "verified-absent" }
  | { source: SourceRef; state: "unavailable"; reason: string };

export interface RuntimeSession {
  ref: SessionRef;
  cwd: string;
  status: SessionStatus;
  observedAt: string;
  changedAt: string;
  changedFrom: "updatedAt" | "startedAt";
  name?: string;
  nameSource?: NameSource;
  continuation?: SessionRef;
  parent?: SessionRef;
  attention?: "approval" | "input" | "error";
}

export interface SessionSnapshot {
  sessions: readonly RuntimeSession[];
  coverage: readonly SourceCoverage[];
}
