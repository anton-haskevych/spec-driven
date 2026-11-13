import { ago } from "../board/cells";
import { sameSession } from "../runtime/identity";
import type { SessionRef } from "../runtime/sessions";
import type { RecordView } from "../record/view";
import { SESSIONS_FOLDER, readSessionDoc, type SessionDoc } from "./session-doc";

// A session that wrote less than this long ago is on the spec; older ones are history nobody cleaned up.
export const SESSION_LISTED_HOURS = 24;
// Documents older than this are history the board never shows, however much unsaved work they claim.
export const SESSION_KEPT_DAYS = 7;
const HOUR_MS = 60 * 60_000;
const PLAN_CHANGERS = new Set(["review", "prep", "create"]);

// Every session document that reads, the latest write first.
export function readSessions(view: RecordView): SessionDoc[] {
  const docs = view.paths().flatMap((path) => {
    if (!path.startsWith(SESSIONS_FOLDER)) return [];
    const doc = readSessionDoc(view.doc(path)).doc;
    return doc ? [doc] : [];
  });
  return docs.toSorted((a, b) => Date.parse(b.lastWriteAt) - Date.parse(a.lastWriteAt));
}

export function sessionsOnSpec(view: RecordView, spec: string, own: SessionRef | undefined, now: Date): SessionDoc[] {
  return readSessions(view).filter((doc) => doc.spec === spec && !(own && sameSession(doc.ref, own)) && isRecent(doc, now));
}

export function isRecent(doc: SessionDoc, now: Date): boolean {
  return now.getTime() - Date.parse(doc.lastWriteAt) < SESSION_LISTED_HOURS * HOUR_MS;
}

export function sessionLine(doc: SessionDoc, now: Date, planVersion: number | undefined): string {
  const where = `${doc.who} on ${doc.host} (tree ${doc.tree})`;
  const head = `Session: ${doc.mode} by ${where}, last wrote ${ago(new Date(doc.lastWriteAt), now)} ago`;
  const behind = doc.planVersion !== undefined && planVersion !== undefined && doc.planVersion < planVersion ? ` · on plan v${doc.planVersion}, the plan is v${planVersion}` : "";
  const changes = PLAN_CHANGERS.has(doc.mode) ? ` — a ${doc.mode} can change this spec's plan` : "";
  return `${head}${behind}${changes}`;
}
