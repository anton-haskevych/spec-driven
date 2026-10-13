import type { LiveSession } from "../sessions/live";

export type OverseerVerdict =
  | { kind: "own" }
  | { kind: "take-over"; from: string; why: "closed" | "parked into this session" }
  | { kind: "other"; id: string; name?: string };

// A tab sent to the background keeps its process and its old session id, while the conversation goes on
// as a job whose session id starts with `parkedJobId`. The recorded id is followed there, so a resumed
// overseer takes its own run over instead of refusing (first crew run, 2026-10-12).
export function whoseRun(recorded: string | undefined, sessions: readonly LiveSession[], ownId: string | undefined): OverseerVerdict {
  if (recorded === undefined || recorded === ownId) return { kind: "own" };
  const holder = sessions.find((session) => session.sessionId === recorded);
  if (!holder) return { kind: "take-over", from: recorded, why: "closed" };
  if (holder.parkedJobId === undefined) return other(holder);
  const jobId = holder.parkedJobId;
  if (ownId?.startsWith(jobId)) return { kind: "take-over", from: recorded, why: "parked into this session" };
  const job = sessions.find((session) => session.sessionId.startsWith(jobId) && session.parkedJobId === undefined);
  return job ? other(job) : { kind: "take-over", from: recorded, why: "closed" };
}

export function overseerLine(verdict: OverseerVerdict): string {
  if (verdict.kind === "own") return "Overseer: this session";
  if (verdict.kind === "take-over") return `Overseer: taking over from ${verdict.from} (${verdict.why})`;
  return `Overseer: another live overseer ${verdict.id}${verdict.name ? ` · ${verdict.name}` : ""}`;
}

function other(session: LiveSession): OverseerVerdict {
  return { kind: "other", id: session.sessionId, ...(session.name ? { name: session.name } : {}) };
}
