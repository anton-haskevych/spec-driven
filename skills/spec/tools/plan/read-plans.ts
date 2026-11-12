import { gitCommonDir, type Git } from "../core/git";
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
  const commonDir = gitCommonDir(git);
  const port = commonDir.ok ? gitRecordReadPort(git, commonDir.value) : undefined;
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
