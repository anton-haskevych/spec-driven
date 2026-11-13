import { isGateKind } from "../core/gate";
import { isPlainObject } from "../record/document";
import type { RecordPlan } from "../record/write";
import { addEdit, type AddIntent } from "./ops/add";
import { planChangePlan, phaseStatePlan, type ChangeSeen } from "./ops/change";
import { moveEdit, type MoveIntent } from "./ops/move";
import { deployedEdit, noteEdit, parkEdit, unparkEdit, type DeployedIntent, type NoteIntent, type ParkIntent, type UnparkIntent } from "./ops/phase-state";
import type { PhaseFields } from "../phases/set";
import { setEdit, type SetIntent } from "./ops/set";
import { splitEdit, type SplitIntent } from "./ops/split";
import { taskEdit, type TaskIntent } from "./ops/task";
import { answerPlan, askPlan, type AnswerIntent, type AskIntent } from "../questions/plans";

type See = (seen: ChangeSeen) => void;
type Fields = Record<string, unknown>;

// One row per plan command: how a queued intent reads back, and the plan it runs against a tip.
interface PlanIntent<T> {
  read(args: Fields): T | undefined;
  plan(intent: T, see?: See): RecordPlan;
}

export interface PlanIntents {
  add: PlanIntent<AddIntent>;
  split: PlanIntent<SplitIntent>;
  move: PlanIntent<MoveIntent>;
  set: PlanIntent<SetIntent>;
  task: PlanIntent<TaskIntent>;
  deployed: PlanIntent<DeployedIntent>;
  park: PlanIntent<ParkIntent>;
  unpark: PlanIntent<UnparkIntent>;
  ask: PlanIntent<AskIntent>;
  answer: PlanIntent<AnswerIntent>;
  note: PlanIntent<NoteIntent>;
}

export type PlanCommand = keyof PlanIntents;

export const PLAN_INTENTS: PlanIntents = {
  add: {
    read: (a) => withSpec(a, { title: text(a.title), after: optional(a.after, text), edges: edgesOf(a.edges), tasks: texts(a.tasks) }),
    plan: (i, see) => planChangePlan(i.spec, "add", addEdit(i), see),
  },
  split: {
    read: (a) => withSpec(a, { id: text(a.id), titles: texts(a.titles), items: positionLists(a.items) }),
    plan: (i, see) => planChangePlan(i.spec, "split", splitEdit(i), see),
  },
  move: {
    read: (a) => withSpec(a, { tasks: texts(a.tasks), to: text(a.to), from: optional(a.from, text) }),
    plan: (i, see) => planChangePlan(i.spec, "move", moveEdit(i), see),
  },
  set: {
    read: (a) => withSpec(a, { phase: text(a.phase), fields: fieldsOf(a.fields) }),
    plan: (i, see) => planChangePlan(i.spec, "set", setEdit(i), see),
  },
  task: {
    read: (a) => taskIntentOf(a),
    plan: (i, see) => planChangePlan(i.spec, "task", taskEdit(i), see),
  },
  deployed: {
    read: (a) => withSpec(a, { phase: text(a.phase), day: text(a.day) }),
    plan: (i, see) => phaseStatePlan(i.spec, "deployed", i.phase, deployedEdit(i), see),
  },
  park: {
    read: (a) => withSpec(a, { phase: text(a.phase), question: text(a.question), recommend: optional(a.recommend, text), at: text(a.at) }),
    plan: (i, see) => phaseStatePlan(i.spec, "park", i.phase, parkEdit(i), see),
  },
  unpark: {
    read: (a) => withSpec(a, { phase: text(a.phase), answer: text(a.answer), at: text(a.at) }),
    plan: (i, see) => phaseStatePlan(i.spec, "unpark", i.phase, unparkEdit(i), see),
  },
  ask: {
    read: (a) => withSpec(a, { phase: text(a.phase), question: text(a.question), recommend: optional(a.recommend, text), at: text(a.at), by: text(a.by) }),
    plan: (i, see) => askPlan(i, see),
  },
  answer: {
    read: (a) => withSpec(a, { id: optional(a.id, text), phase: optional(a.phase, text), text: text(a.text), by: text(a.by), at: text(a.at), ifVersion: optional(a.ifVersion, text) }),
    plan: (i, see) => answerPlan(i, see),
  },
  note: {
    read: (a) => withSpec(a, { phase: text(a.phase), note: optional(a.note, text), at: text(a.at), by: text(a.by) }),
    plan: (i, see) => phaseStatePlan(i.spec, "note", i.phase, noteEdit(i), see),
  },
};

const UNREADABLE: RecordPlan = () => ({ refused: "this queued change can't be read; drop it" });

// What the outbox replays: a malformed entry plans a refusal rather than a guess.
export function planIntentRunner(command: PlanCommand): (args: unknown) => RecordPlan {
  return (args) => {
    const row = PLAN_INTENTS[command] as PlanIntent<unknown>;
    const intent = isPlainObject(args) ? row.read(args) : undefined;
    return intent === undefined ? UNREADABLE : row.plan(intent);
  };
}

const MISSING = Symbol("missing");
type Read<T> = T | typeof MISSING;

// Every field read; one missing or malformed one makes the whole intent unreadable.
function withSpec<T extends Record<string, unknown>>(args: Fields, fields: { [K in keyof T]: Read<T[K]> }): ({ spec: string } & T) | undefined {
  const spec = text(args.spec);
  const values = Object.entries(fields);
  if (spec === MISSING || values.some(([, value]) => value === MISSING)) return undefined;
  return { spec, ...Object.fromEntries(values.filter(([, value]) => value !== undefined)) } as { spec: string } & T;
}

function text(value: unknown): Read<string> {
  return typeof value === "string" && value !== "" ? value : MISSING;
}

function optional<T>(value: unknown, read: (value: unknown) => Read<T>): Read<T | undefined> {
  return value === undefined ? undefined : read(value);
}

function texts(value: unknown): Read<string[]> {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : MISSING;
}

function positionLists(value: unknown): Read<number[][]> {
  const ok = Array.isArray(value) && value.every((list) => Array.isArray(list) && list.every((n) => Number.isInteger(n) && n > 0));
  return ok ? (value as number[][]) : MISSING;
}

function edgesOf(value: unknown): Read<AddIntent["edges"]> {
  if (!isPlainObject(value)) return MISSING;
  const lists = ["needs", "needsDeployed", "sameFilesAs"].map((key) => [key, optional(value[key], texts)] as const);
  const pr = optional(value.pr, text);
  const code = value.code === undefined || typeof value.code === "boolean" ? value.code : MISSING;
  if (pr === MISSING || code === MISSING || lists.some(([, list]) => list === MISSING)) return MISSING;
  return Object.fromEntries([...lists, ["pr", pr], ["code", code]].filter(([, field]) => field !== undefined));
}

function fieldsOf(value: unknown): Read<PhaseFields> {
  if (!isPlainObject(value)) return MISSING;
  const needs = optional(value.needs, texts);
  const needsDeployed = optional(value.needsDeployed, texts);
  const sameFilesAs = optional(value.sameFilesAs, texts);
  const pr = value.pr === null ? null : optional(value.pr, text);
  const gate = value.gate === null || value.gate === undefined || isGateKind(value.gate) ? value.gate : MISSING;
  const title = optional(value.title, text);
  const outcome = value.outcome === undefined || typeof value.outcome === "string" ? value.outcome : MISSING;
  const fields = { needs, needsDeployed, sameFilesAs, pr, gate, title, outcome };
  if (Object.values(fields).some((field) => field === MISSING)) return MISSING;
  return Object.fromEntries(Object.entries(fields).filter(([, field]) => field !== undefined));
}

function taskIntentOf(a: Fields): TaskIntent | undefined {
  if (a.action === "add") return withSpec(a, { phase: text(a.phase), action: "add" as const, texts: texts(a.texts) });
  if (a.action === "edit") return withSpec(a, { phase: text(a.phase), action: "edit" as const, task: text(a.task), text: text(a.text) });
  if (a.action === "drop") return withSpec(a, { phase: text(a.phase), action: "drop" as const, task: text(a.task) });
  return undefined;
}
