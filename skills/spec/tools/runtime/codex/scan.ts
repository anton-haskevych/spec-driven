import type { CodexSource, RuntimeSession, SessionSnapshot } from "../sessions";
import { codexSession, loadedPage } from "./decode";
import type { ReadOnlyRpc } from "./transport";

export interface ScanResult {
  snapshot: SessionSnapshot;
  pages: number;
  reason?: string;
}

export async function scanLoaded(rpc: ReadOnlyRpc, source: CodexSource, observedAt: string): Promise<ScanResult> {
  const sessions: RuntimeSession[] = [];
  const cursors = new Set<string>();
  const ids = new Set<string>();
  const deadline = AbortSignal.timeout(10_000);
  let cursor: string | undefined;
  let pages = 0;
  const failed = (reason: string): ScanResult => ({ snapshot: { sessions, coverage: [{ source, state: "unavailable", reason }] }, pages, reason });
  do {
    if (deadline.aborted || pages >= 20) return failed("Codex discovery budget exhausted");
    const response = await rpc.request("thread/loaded/list", { limit: 100, ...(cursor ? { cursor } : {}) });
    pages++;
    if (!response.ok) return failed(response.reason);
    const page = loadedPage(response.value);
    if (!page.ok) return failed(page.reason);
    for (const id of page.value.ids) {
      if (ids.has(id)) continue;
      if (deadline.aborted || ids.size >= 200) return failed("Codex discovery budget exhausted");
      ids.add(id);
      const read = await rpc.request("thread/read", { threadId: id, includeTurns: false });
      if (!read.ok) return failed(read.reason);
      const session = codexSession(read.value, id, source, observedAt);
      if (!session.ok) return failed(session.reason);
      sessions.push(session.value);
    }
    cursor = page.value.next;
    if (cursor && cursors.has(cursor)) return failed("Codex pagination cursor repeated");
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return { snapshot: { sessions, coverage: [{ source, state: "complete" }] }, pages };
}
