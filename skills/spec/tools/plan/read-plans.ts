import { gitAt, gitCommonDir, type Git } from "../core/git";
import type { Runner } from "../core/run";
import { loadSettings } from "../playbook/settings";
import type { MarksSource } from "../graph/nodes";
import { listOutbox, outboxDir, type OutboxEntry } from "../record/outbox";
import { overlayIntents } from "../record/overlay";
import { gitRecordReadPort, readRecord, recordViewOf, type RecordRead, type RecordReadOptions } from "../record/read";
import { INTENT_PLANNERS } from "./intents";
import { validateRecordDoc } from "./kinds";
import { joinedPhaseMarks, readJoinedPlan, stateSourceFor, type JoinedPlan, type SpecSource } from "./state-source";

export interface PlanSource {
  state: SpecSource;
  marks: MarksSource;
  isJoined(spec: string): boolean;
  joined(spec: string): JoinedPlan | undefined;
  record: RecordRead;
  // Changes this clone queued while origin was unreachable; reads already show them.
  pending: number;
}

export const FILES_ONLY: PlanSource = planSourceOf({ kind: "none" });

export function readPlans(git: Git, options: RecordReadOptions): PlanSource {
  const port = gitRecordReadPort(git);
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

// Opens the record on the first spec asked for: a command aimed at a PR number never reads it.
export function specStatesAt(projectDir: string, runner: Runner, now: Date): SpecSource {
  let plans: PlanSource | undefined;
  return (spec) => (plans ??= readPlansAt(projectDir, runner, now)).state(spec);
}

// Hooks and the doctor never fetch: they read what the last fetch left.
export function readLocalPlans(projectDir: string, runner: Runner, now: Date): PlanSource {
  return readPlans(gitAt(projectDir, runner), { fetch: false, now });
}
