import { gitAt, gitCommonDir, type Git } from "../core/git";
import type { Runner } from "../core/run";
import { loadSettings } from "../playbook/settings";
import type { FieldsSource, MarksSource } from "../graph/nodes";
import type { RecordFields } from "../graph/spec-fields";
import { FIELDS_LAYOUT } from "../record/layout";
import type { PrDoc } from "./docs/pr-doc";
import type { SpecDoc } from "./docs/spec-doc";
import { readSpecPrDocs } from "./pr-sync";
import { listOutbox, outboxDir, type OutboxEntry } from "../record/outbox";
import { overlayIntents } from "../record/overlay";
import { gitRecordReadPort, readRecord, recordViewOf, type RecordRead, type RecordReadOptions } from "../record/read";
import { INTENT_PLANNERS } from "./intents";
import { validateRecordDoc } from "./kinds";
import { joinedPhaseMarks, readJoinedPlan, stateSourceFor, type JoinedPlan, type SpecSource } from "./state-source";

export interface PlanSource {
  state: SpecSource;
  marks: MarksSource;
  fields: FieldsSource;
  isJoined(spec: string): boolean;
  joined(spec: string): JoinedPlan | undefined;
  // A spec's PR documents once it is on layout 2; before that its PR lines are in pr-opening.md.
  prs(spec: string): PrDoc[] | undefined;
  record: RecordRead;
  // Changes this clone queued while origin was unreachable; reads already show them.
  pending: number;
}

export const FILES_ONLY: PlanSource = planSourceOf({ kind: "none" });

export function readPlans(git: Git, options: RecordReadOptions & { fetchTimeoutMs?: number }): PlanSource {
  const port = gitRecordReadPort(git, options.fetchTimeoutMs);
  const read: RecordRead = port ? readRecord(port, options) : { kind: "none" };
  if (read.kind !== "read") return planSourceOf(read);
  const queued = queuedIntents(git);
  return planSourceOf({ ...read, view: overlayIntents(read.view, queued, INTENT_PLANNERS, validateRecordDoc) }, queued.length);
}

function queuedIntents(git: Git): OutboxEntry[] {
  const common = gitCommonDir(git);
  return common.ok ? listOutbox(outboxDir(common.value)).filter((entry) => entry.refused === undefined) : [];
}

export function planSourceOf(record: RecordRead, pending = 0): PlanSource {
  const view = recordViewOf(record);
  const plan = (spec: string) => (view ? readJoinedPlan(view, spec) : undefined);
  return {
    state: stateSourceFor(view),
    marks: (spec) => {
      const joined = plan(spec);
      return joined ? joinedPhaseMarks(joined) : undefined;
    },
    fields: (spec) => {
      const joined = plan(spec)?.spec;
      return joined && joined.layout >= FIELDS_LAYOUT ? recordFieldsOf(joined) : undefined;
    },
    prs: (spec) => {
      const joined = plan(spec)?.spec;
      return view && joined && joined.layout >= FIELDS_LAYOUT ? readSpecPrDocs(view, spec) : undefined;
    },
    isJoined: (spec) => plan(spec) !== undefined,
    joined: plan,
    record,
    pending,
  };
}

// A one-spec command in a checkout: it fetches when this checkout's settings turn the board on.
export function readPlansAt(projectDir: string, runner: Runner, now: Date): PlanSource {
  return readPlans(gitAt(projectDir, runner), { fetch: loadSettings(projectDir).board.record, now });
}

export type SpecPlans = Pick<PlanSource, "state" | "prs" | "joined">;

// Opens the record on the first spec asked for: a command aimed at a PR number never reads it.
export function plansOnDemandAt(projectDir: string, runner: Runner, now: Date): SpecPlans {
  let plans: PlanSource | undefined;
  const open = () => (plans ??= readPlansAt(projectDir, runner, now));
  return { state: (spec) => open().state(spec), prs: (spec) => open().prs(spec), joined: (spec) => open().joined(spec) };
}

export function specStatesAt(projectDir: string, runner: Runner, now: Date): SpecSource {
  return plansOnDemandAt(projectDir, runner, now).state;
}

// Hooks and the doctor never fetch: they read what the last fetch left.
export function readLocalPlans(projectDir: string, runner: Runner, now: Date): PlanSource {
  return readPlans(gitAt(projectDir, runner), { fetch: false, now });
}

function recordFieldsOf({ status, owner, focus, ship }: SpecDoc): RecordFields {
  return { ...(status ? { status } : {}), ...(owner ? { owner } : {}), ...(focus ? { focus } : {}), ...(ship ? { ship } : {}) };
}
