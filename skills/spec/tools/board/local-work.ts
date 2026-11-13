import { basename } from "node:path";
import { gitAt } from "../core/git";
import type { Runner } from "../core/run";
import type { SessionDoc } from "../sessions/session-doc";
import { treeWork } from "../workspaces/changes";

// A document's counts are as of its last write: a push or a commit since then is only visible by looking.
// On this machine the tree is right here, so look; another machine's document stays as written.
export function withLocalWork(docs: readonly SessionDoc[], thisHost: string, worktreePaths: readonly string[], runner: Runner): SessionDoc[] {
  return docs.map((doc) => {
    if (doc.host.toLowerCase() !== thisHost.toLowerCase() || (doc.ahead ?? 0) + (doc.edited ?? 0) === 0) return doc;
    const path = worktreePaths.find((candidate) => basename(candidate) === doc.tree);
    const work = path === undefined ? undefined : treeWork(gitAt(path, runner));
    if (!work?.ok) return doc;
    const { ahead: _stale, edited: _staleEdited, ...rest } = doc;
    return { ...rest, ...(work.value.ahead === undefined ? {} : { ahead: work.value.ahead }), edited: work.value.edited };
  });
}
