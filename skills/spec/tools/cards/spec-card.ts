import { parseFrontmatter, stringField } from "../core/frontmatter";
import { withoutUndefined } from "../core/read-fields";
import { compareDue, priorityRank, readSchedule, type Priority } from "../core/schedule";
import { parseRef } from "../graph/relations";
import { validateRecordDoc } from "../plan/kinds";
import type { RecordOp } from "../record/plan-writes";
import type { RecordView } from "../record/view";
import { refsTo } from "./cover";
import { addCardEdit, nextCardId } from "./plans";
import { readCards } from "./read";

// What a spec's own files say about it, for the card that will carry it.
export interface SpecCardSeed {
  title: string;
  priority?: Priority;
  due?: string;
  createdAt?: string;
}

export interface CardSchedule {
  priority?: Priority;
  due?: string;
}

export const SPEC_APP = "spec";
const H1 = /^#[ \t]+(.+?)\s*$/m;

export function specCardSeed(claudeMd: string, spec: string): SpecCardSeed {
  const parsed = parseFrontmatter(claudeMd);
  if (parsed.kind !== "ok") return { title: H1.exec(claudeMd)?.[1] ?? spec };
  const { priority, due } = readSchedule(parsed.data);
  return withoutUndefined({ title: H1.exec(parsed.body)?.[1] ?? spec, priority, due, createdAt: stringField(parsed.data, "created") });
}

// Every spec has a card: planned at the tip, a spec some card already covers (open or closed) gets none.
// A seed the card rules refuse makes no card rather than refusing the batch it rides in.
export function specCard(view: RecordView, spec: string, seed: SpecCardSeed, at: string): { id: string; ops: RecordOp[] } | undefined {
  if (readCards(view).some((card) => card.status !== "dropped" && refsTo(card.coveredBy, spec).length > 0)) return undefined;
  const edit = addCardEdit(view, {
    ...withoutUndefined({ priority: seed.priority, due: seed.due }),
    title: seed.title,
    commitment: "asked",
    tags: [],
    coveredBy: [spec],
    at,
    origin: { app: SPEC_APP, occurredAt: seed.createdAt ?? at, quote: seed.title, ref: `${SPEC_APP}:${spec}` },
  });
  if (!("ops" in edit)) return undefined;
  const readable = edit.ops.every((op) => op.op !== "create" || validateRecordDoc(op.path, op.doc).length === 0);
  return readable ? { id: nextCardId(view), ops: edit.ops } : undefined;
}

// A spec's priority and due date as its open covering cards give them: the best priority, the earliest day.
export function cardSchedules(view: RecordView): Map<string, CardSchedule> {
  const schedules = new Map<string, CardSchedule>();
  for (const card of readCards(view)) {
    if (card.status !== "open" && card.status !== "doing") continue;
    for (const spec of new Set(card.coveredBy.map((ref) => parseRef(ref).target))) {
      const current = schedules.get(spec) ?? {};
      const priority = priorityRank(card.priority) < priorityRank(current.priority) ? card.priority : current.priority;
      const due = compareDue(card.due, current.due) < 0 ? card.due : current.due;
      schedules.set(spec, withoutUndefined({ priority, due }));
    }
  }
  return schedules;
}
