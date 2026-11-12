import { serializeDoc } from "./document";
import type { Intent } from "./outbox";
import { planWrites, type Validate } from "./plan-writes";
import { viewOfTexts, type RecordView } from "./view";
import type { RecordPlan } from "./write";

export type IntentPlanners = Readonly<Record<string, (args: unknown) => RecordPlan>>;

// What this clone has queued, laid over the record in order, so its reads show a queued tick as done. An
// intent that no longer plans (closed meanwhile, no planner in this version) is left out, not guessed at.
export function overlayIntents(view: RecordView, intents: readonly Intent[], planners: IntentPlanners, validate: Validate): RecordView {
  let current = view;
  for (const intent of intents) {
    const planner = planners[intent.command];
    const planned = planner?.(intent.args)(current);
    if (!planned || !("ops" in planned)) continue;
    const written = planWrites(current, planned.ops, validate);
    if (written.kind !== "planned") continue;
    const texts = new Map(current.paths().map((path) => [path, serializeDoc(current.doc(path))]));
    for (const change of written.changes) {
      if (change.text === undefined) texts.delete(change.path);
      else texts.set(change.path, change.text);
    }
    current = viewOfTexts(texts, view.tip);
  }
  return current;
}
