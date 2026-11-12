import { gitAt, type Git } from "../core/git";
import type { Runner } from "../core/run";
import { loadSettings } from "../playbook/settings";
import type { MarksSource } from "../graph/nodes";
import { gitRecordReadPort, readRecord, recordViewOf, type RecordRead, type RecordReadOptions } from "../record/read";
import { joinedPhaseMarks, readJoinedPlan, stateSourceFor, type SpecSource } from "./state-source";

export interface PlanSource {
  state: SpecSource;
  marks: MarksSource;
  isJoined(spec: string): boolean;
  record: RecordRead;
}

export const FILES_ONLY: PlanSource = planSourceOf({ kind: "none" });

export function readPlans(git: Git, options: RecordReadOptions): PlanSource {
  const port = gitRecordReadPort(git);
  return planSourceOf(port ? readRecord(port, options) : { kind: "none" });
}

export function planSourceOf(record: RecordRead): PlanSource {
  const view = recordViewOf(record);
  const plan = (spec: string) => (view ? readJoinedPlan(view, spec) : undefined);
  return {
    state: stateSourceFor(view),
    marks: (spec) => {
      const joined = plan(spec);
      return joined ? joinedPhaseMarks(joined) : undefined;
    },
    isJoined: (spec) => plan(spec) !== undefined,
    record,
  };
}

// A one-spec command in a checkout: it fetches when this checkout's settings turn the board on.
export function readPlansAt(projectDir: string, runner: Runner, now: Date): PlanSource {
  return readPlans(gitAt(projectDir, runner), { fetch: loadSettings(projectDir).board.record, now });
}

// Hooks and the doctor never fetch: they read what the last fetch left.
export function readLocalPlans(projectDir: string, runner: Runner, now: Date): PlanSource {
  return readPlans(gitAt(projectDir, runner), { fetch: false, now });
}
