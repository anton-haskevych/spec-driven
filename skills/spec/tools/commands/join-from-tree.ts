import { basename } from "node:path";
import { gitAt } from "../core/git";
import { resolveSpec } from "../core/spec-folders";
import { diskReader } from "../core/spec-state";
import { fromTreePlan } from "../plan/join-from-tree";
import { validateRecordDoc } from "../plan/kinds";
import { recordPortsOf } from "../core/git-seams";
import { writeRecord, type StoreWrite } from "../record/write";
import { ownSessionId } from "../sessions/own";
import type { JoinDeps } from "./join";

// Never queued, like join: it reads this tree against the record as it is now.
export async function joinFromTree(projectDir: string, spec: string, deps: JoinDeps): Promise<string> {
  const git = gitAt(projectDir, deps.runner);
  const port = recordPortsOf(git, deps)?.port;
  if (!port) return "join: this repo has no origin; the board's record lives there";
  const folder = resolveSpec(projectDir, spec);
  if (typeof folder === "string") return `join: ${folder}`;
  const head = git.out(["rev-parse", "HEAD"]);
  if (!head.ok) return `join: ${head.reason}`;
  const top = git.out(["rev-parse", "--show-toplevel"]);
  const tree = basename(top.ok ? top.value : projectDir);
  const session = deps.env ? ownSessionId(deps.env) : undefined;
  let ticked: string[] = [];
  const copy = { spec, read: diskReader(folder.dir), tree, head: head.value, at: deps.now().toISOString(), ...(session ? { session } : {}) };
  const written = await writeRecord(port, fromTreePlan(copy, (ids) => (ticked = ids)), { validate: validateRecordDoc });
  return fromTreeLine(written, tree, ticked, head.value);
}

function fromTreeLine(written: StoreWrite, tree: string, ticked: readonly string[], head: string): string {
  const refused = (reason: string) => `join: refused, nothing written. ${reason}`;
  switch (written.kind) {
    case "landed":
      return `join: recorded ${ticked.length} ${ticked.length === 1 ? "tick" : "ticks"} from tree ${tree} (${ticked.join(", ")}) at ${head.slice(0, 7)}`;
    case "unchanged":
      return `join: nothing in tree ${tree} is ahead of the board`;
    case "offline":
      return refused(`Can't reach origin (${written.reason}); a join is never queued.`);
    case "refused":
    case "failed":
      return refused(`${written.reason}.`);
    case "invalid":
      return refused(written.problems.join("; "));
    case "conflict":
      return refused(`${written.path} changed while it was written; run it again.`);
  }
}
