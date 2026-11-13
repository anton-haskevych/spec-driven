import { gitAt } from "../../core/git";
import { isoTimestamp } from "../../core/schedule";
import { resolveSpec } from "../../core/spec-folders";
import { questionDocPath } from "../../plan/kinds";
import { renderPhaseOutcome, type PhaseDeps } from "../../plan/phase-writer";
import { PLAN_INTENTS } from "../../plan/plan-intents";
import { readPlansAt } from "../../plan/read-plans";
import { recordPlanCommand } from "../../plan/record-plan";
import { withPlanNotice } from "../../plan/write-notice";
import { recordViewOf } from "../../record/read";
import { OLDER_PLUGIN } from "../../record/write";
import { answererOf } from "../../questions/who";

// An answer by id names the version it was read at: a question someone changed since is a conflict.
export async function answerById(projectDir: string, specName: string, id: string, text: string, deps: PhaseDeps, ifVersion?: string): Promise<string> {
  const plans = readPlansAt(projectDir, deps.runner, deps.now());
  if (plans.record.kind === "newer") return `question answer: ${OLDER_PLUGIN}`;
  const spec = resolveSpec(projectDir, specName);
  if (typeof spec === "string") return `question answer: ${spec}`;
  const joined = plans.joined(spec.name);
  if (!joined) return `question answer: ${spec.name} is not on the board; answer its park by phase: question answer ${spec.name} <phase> "<answer>"`;
  const version = ifVersion ?? recordViewOf(plans.record)?.version(questionDocPath(spec.name, id));
  const intent = { spec: spec.name, id, text, by: answererOf(gitAt(projectDir, deps.runner)), at: isoTimestamp(deps.now()), ...(version ? { ifVersion: version } : {}) };
  const outcome = await withPlanNotice(projectDir, spec.name, joined, deps, (world) =>
    recordPlanCommand(world, spec, joined, { command: "answer", args: intent, plan: (see) => PLAN_INTENTS.answer.plan(intent, see) }),
  );
  return outcome.kind === "invalid" ? [outcome.notice, `question answer: ${outcome.reason}`].filter(Boolean).join("\n") : renderPhaseOutcome("answer", outcome);
}
