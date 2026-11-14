import { gitAt } from "../../core/git";
import { defaultBranch } from "../../core/run";
import { isoTimestamp } from "../../core/schedule";
import type { See } from "../../cards/plans";
import { boardBase } from "../../plan/board-base";
import { validateRecordDoc } from "../../plan/kinds";
import type { PhaseDeps } from "../../plan/phase-writer";
import { loadSettings } from "../../playbook/settings";
import { recordPortsOf } from "../../core/git-seams";
import { writeRecord, type RecordPlan } from "../../record/write";
import { stampedBy } from "../../sessions/facts";
import { NO_DEFAULT_BRANCH } from "../push";
import { NO_ORIGIN, refusedLine, writtenReason } from "./send";

// What a write needs from the default branch (its people) and the time it is made.
export type PlanFor = (people: readonly string[], at: string) => ((see: See) => RecordPlan) | { refused: string };

// Never queued: Claude quotes the numbers at once, and a queued write could come back with others.
// Returns the plan's lines from the tip it landed on.
export async function landNow(projectDir: string, deps: PhaseDeps, action: string, planFor: PlanFor, maxOps?: number): Promise<string> {
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return refusedLine(action, NO_DEFAULT_BRANCH.replace("nothing pushed", "nothing written"));
  const git = gitAt(projectDir, deps.runner);
  const port = recordPortsOf(git, deps)?.port;
  if (!port) return refusedLine(action, NO_ORIGIN);
  const base = await boardBase(git, branch, "a new card");
  if (!base.ok) return refusedLine(action, base.reason);
  const planned = planFor(loadSettings(base.value.projectDir).board.people, isoTimestamp(deps.now()));
  if ("refused" in planned) return refusedLine(action, planned.refused);
  let lines: string[] = [];
  const plan = planned((line) => lines.push(line));
  const atTip: RecordPlan = (view) => {
    lines = [];
    return plan(view);
  };
  const written = await writeRecord(port, stampedBy(git, deps.env, projectDir, deps.now())(atTip), { validate: validateRecordDoc, ...(maxOps ? { maxOps } : {}) });
  if (written.kind === "landed") return lines.join("\n");
  if (written.kind === "offline") return refusedLine(action, `Can't reach origin (${written.reason}); card ${action} is never queued, so run it again when origin answers.`);
  return refusedLine(action, written.kind === "unchanged" ? "nothing to write" : writtenReason(written, action));
}
