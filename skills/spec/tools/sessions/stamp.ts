import { isoTimestamp } from "../core/schedule";
import { readSpecDoc } from "../plan/docs/spec-doc";
import type { RecordOp } from "../record/plan-writes";
import type { RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import type { SessionRef } from "../runtime/sessions";
import type { TreeWork } from "../workspaces/changes";
import { readSessionDoc, sessionDocPath, type SessionDoc, type SessionMode } from "./session-doc";

// What the command layer knows about the session writing: gathered once per command, never inside a plan,
// which runs again on every tip it loses a race to.
export interface SessionFacts {
  ref: SessionRef;
  who: string;
  host: string;
  tree: string;
  branch?: string;
  work?: TreeWork;
}

// What a write changes about the session itself: registration sets all three, a plan's own ops the spec.
export interface SessionChange {
  mode?: SessionMode;
  spec?: string;
  title?: string;
}

// The session's own document, whole: last write wins, so two sub-agents under one session never fail a tick
// over a heartbeat. Mode, spec and title are what registration wrote; the plan version is the spec's now.
export function stampSession(view: RecordView, facts: SessionFacts, now: Date, change: SessionChange = {}): RecordOp[] {
  const path = sessionDocPath(facts.ref);
  const earlier = readSessionDoc(view.doc(path)).doc;
  const spec = change.spec ?? earlier?.spec;
  const title = change.title ?? earlier?.title;
  const planVersion = spec === undefined ? undefined : readSpecDoc(view.doc(`specs/${spec}/spec.json`)).doc?.planVersion;
  const doc: SessionDoc = {
    ref: facts.ref,
    who: facts.who,
    host: facts.host,
    tree: facts.tree,
    mode: change.mode ?? earlier?.mode ?? "execute",
    lastWriteAt: isoTimestamp(now),
    ...(spec === undefined ? {} : { spec }),
    ...(facts.branch === undefined ? {} : { branch: facts.branch }),
    ...(title === undefined ? {} : { title }),
    ...(planVersion === undefined ? {} : { planVersion }),
    ...(facts.work?.ahead === undefined ? {} : { ahead: facts.work.ahead }),
    ...(facts.work === undefined ? {} : { edited: facts.work.edited }),
  };
  return [{ op: "replace", path, doc }];
}

// The session stamps every batch it makes: one more op in the same commit, no extra push, and its time
// is the heartbeat. A plan that writes nothing leaves no stamp.
export function withStamp(plan: RecordPlan, facts: () => SessionFacts | undefined, now: Date): RecordPlan {
  return (view) => {
    const intent = plan(view);
    const session = "ops" in intent ? facts() : undefined;
    if (!("ops" in intent) || !session) return intent;
    const spec = specTouched(intent.ops);
    return { ...intent, alongside: [...(intent.alongside ?? []), ...stampSession(view, session, now, spec === undefined ? {} : { spec })] };
  };
}

// An execute session never registers; the one spec its write is about says where it works.
function specTouched(ops: readonly RecordOp[]): string | undefined {
  const specs = new Set(ops.flatMap(({ path }) => SPEC_PATH.exec(path)?.[1] ?? []));
  const [only] = specs;
  return specs.size === 1 ? only : undefined;
}

const SPEC_PATH = /^specs\/([^/]+)\//;
