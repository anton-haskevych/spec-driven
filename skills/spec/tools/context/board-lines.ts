import { ago } from "../board/cells";
import type { ReadSpecFile } from "../core/spec-state";
import { entryTasks, taskKey } from "../plan/entry-tasks";
import type { JoinedPlan } from "../plan/state-source";
import type { RecordRead } from "../record/read";

export const OLDER_PLUGIN = "record: this plugin is older than the board's layout; update it";

// Only a joined spec's pack opens with it: a spec on files reads as it always did.
export function boardLine(read: RecordRead, joined: JoinedPlan | undefined, pending = 0): string | undefined {
  if (read.kind === "newer") return OLDER_PLUGIN;
  if (read.kind !== "read" || !joined) return undefined;
  const queued = pending === 0 ? "" : ` · ${pending} ${pending === 1 ? "change" : "changes"} not shared yet`;
  const plan = `plan v${joined.spec.planVersion}${queued}`;
  if (read.live) return `Board: live · ${plan}`;
  const age = read.ageMs === undefined ? "of unknown age" : `from ${ago(new Date(0), new Date(read.ageMs))} ago`;
  return `Board: local copy ${age}${read.offline ? " (origin unreachable)" : ""} · ${plan}`;
}

// A box ticked by hand in this tree's frozen phase file never reaches the record.
export function treeAheadLine(joined: JoinedPlan, read: ReadSpecFile): string | undefined {
  const ahead = joined.phases.flatMap((phase) => {
    const text = read(phase.file);
    if (text === undefined) return [];
    const ticked = new Set(entryTasks(text).filter((item) => item.done).map((item) => taskKey(item.text)));
    return phase.tasks.filter((task) => !task.done && ticked.has(taskKey(task.text))).map((task) => task.id);
  });
  if (ahead.length === 0) return undefined;
  const ticks = ahead.length === 1 ? "1 tick" : `${ahead.length} ticks`;
  return `Tree is ahead of the board: ${ticks} (${ahead.join(", ")}) ${ahead.length === 1 ? "is" : "are"} open on the record.`;
}
