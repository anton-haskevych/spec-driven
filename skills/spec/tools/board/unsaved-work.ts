import { basename } from "node:path";
import type { SessionDoc } from "../sessions/session-doc";
import type { BoardInputs } from "./inputs";
import type { AttentionRow } from "./model";

// A tree still being written to is someone mid-task; one quiet this long holding work no remote has is
// the work one laptop is the only home of.
export const UNSAVED_WORK_HOURS = 3;
const HOUR_MS = 3_600_000;

type Inputs = Pick<BoardInputs, "sessionDocs" | "thisHost" | "worktreePaths">;
export type UnsavedWorkRow = Extract<AttentionRow, { kind: "unsaved-work" }>;

// From each tree's latest session document: later writes that found it clean end the row.
export function unsavedWork(inputs: Inputs, now: Date): UnsavedWorkRow[] {
  const here = inputs.thisHost.toLowerCase();
  const worktrees = new Set(inputs.worktreePaths.map((path) => basename(path)));
  return [...latestPerTree(inputs.sessionDocs).values()].flatMap((doc): UnsavedWorkRow[] => {
    const ahead = doc.ahead ?? 0;
    const edited = doc.edited ?? 0;
    const onThisMachine = doc.host.toLowerCase() === here;
    if (ahead + edited === 0 || now.getTime() - Date.parse(doc.lastWriteAt) < UNSAVED_WORK_HOURS * HOUR_MS) return [];
    if (onThisMachine && !worktrees.has(doc.tree)) return [];
    return [{ kind: "unsaved-work", who: doc.who, host: doc.host, tree: doc.tree, ahead, edited, since: doc.lastWriteAt, here: onThisMachine }];
  });
}

function latestPerTree(docs: readonly SessionDoc[]): Map<string, SessionDoc> {
  const latest = new Map<string, SessionDoc>();
  for (const doc of docs) {
    const key = `${doc.host.toLowerCase()}\u0000${doc.tree}`;
    const kept = latest.get(key);
    if (!kept || Date.parse(doc.lastWriteAt) > Date.parse(kept.lastWriteAt)) latest.set(key, doc);
  }
  return latest;
}
