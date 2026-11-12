import { landOnRef, type FileChange, type RefEdit, type Tip } from "../core/land-on-ref";
import { isPlainObject, serializeDoc } from "./document";
import { META_PATH, RECORD_LAYOUT } from "./layout";
import { planWrites, type Conflict, type RecordOp, type Validate } from "./plan-writes";
import type { RecordPort } from "./ref";
import { openRecordView, type RecordView } from "./view";

export type RecordPlan = (view: RecordView) => { ops: RecordOp[]; message?: string } | { refused: string } | { unchanged: true };

type Stopped = { kind: "unchanged" } | { kind: "refused"; reason: string } | Conflict | { kind: "invalid"; problems: string[] } | { kind: "failed"; reason: string };

// `offline` never reaches a caller as is: the outbox turns it into `queued`.
export type StoreWrite = { kind: "landed"; tip: string; versions: Record<string, string> } | Stopped | { kind: "offline"; reason: string };

export interface WriteOptions {
  validate: Validate;
  pause?: (ms: number) => Promise<void>;
}

export const OLDER_PLUGIN = "record: this plugin is older than the board's layout; update it";
const DEFAULT_MESSAGE = "record: write";

export async function writeRecord(port: RecordPort, plan: RecordPlan, options: WriteOptions): Promise<StoreWrite> {
  const landing = await landOnRef<Record<string, string>, Stopped>(port, (tip) => planEdit(port, tip, plan, options.validate), {
    name: "the board's record",
    ...(options.pause ? { pause: options.pause } : {}),
  });
  if (landing.kind === "landed") return { kind: "landed", tip: landing.sha, versions: landing.landed };
  return landing.kind === "stopped" ? landing.outcome : landing;
}

function planEdit(port: RecordPort, tip: Tip, plan: RecordPlan, validate: Validate): RefEdit<Record<string, string>, Stopped> {
  const view = openRecordView(port, tip);
  if (!view.ok) return stop({ kind: "failed", reason: view.reason });
  const layout = layoutOf(view.value);
  if (layout !== undefined && layout > RECORD_LAYOUT) return stop({ kind: "refused", reason: OLDER_PLUGIN });

  const intent = plan(view.value);
  if ("refused" in intent) return stop({ kind: "refused", reason: intent.refused });
  if ("unchanged" in intent) return stop({ kind: "unchanged" });
  const planned = planWrites(view.value, intent.ops, validate);
  if (planned.kind !== "planned") return stop(planned);
  if (planned.changes.length === 0) return stop({ kind: "unchanged" });
  return { kind: "commit", changes: withMeta(planned.changes, layout), message: intent.message ?? DEFAULT_MESSAGE, landed: planned.versions };
}

function layoutOf(view: RecordView): number | undefined {
  const meta = view.doc(META_PATH);
  return isPlainObject(meta) && typeof meta.layout === "number" ? meta.layout : undefined;
}

function withMeta(changes: FileChange[], layout: number | undefined): FileChange[] {
  return layout === undefined ? [{ path: META_PATH, text: serializeDoc({ layout: RECORD_LAYOUT }) }, ...changes] : changes;
}

function stop(outcome: Stopped): RefEdit<Record<string, string>, Stopped> {
  return { kind: "stop", outcome };
}
