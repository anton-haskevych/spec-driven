import type { Git } from "../core/git";
import { pushCommit } from "../publish/push-commit";
import type { IntentRun, IntentRunners } from "../record/outbox";
import type { IntentPlanners } from "../record/overlay";
import type { RecordPlan } from "../record/write";
import { readTickIntent, tickPlan, type TickIntent } from "./ops/tick";
import { PLAN_INTENTS, planIntentRunner, type PlanCommand } from "./plan-intents";
import { FIELD_COMMAND, fieldPlan, readFieldIntent } from "./ops/field";

const UNREADABLE: RecordPlan = () => ({ refused: "this queued change can't be read; drop it" });
const PUSHED_COMMIT = /^([0-9a-f]{40}) on origin\/(\S+)/;

// Plan changes, phase state and spec fields need no network step of their own: overlay and flush run the same plan.
const PLAN_RUNNERS = {
  ...Object.fromEntries((Object.keys(PLAN_INTENTS) as PlanCommand[]).map((command) => [command, planIntentRunner(command)])),
  [FIELD_COMMAND]: (args: unknown) => {
    const intent = readFieldIntent(args);
    return intent ? fieldPlan(intent) : UNREADABLE;
  },
};

// The pure plan of each queued intent: what reads lay over the record while it waits.
export const INTENT_PLANNERS: IntentPlanners = {
  ...PLAN_RUNNERS,
  tick: (args) => {
    const intent = readTickIntent(args);
    return intent ? tickPlan(intent) : UNREADABLE;
  },
};

// What a flush sends: a tick made offline pushes its commit first, so the record never names a commit
// origin doesn't have.
export function intentRunners(git: Git): IntentRunners {
  return {
    ...PLAN_RUNNERS,
    tick: (args) => {
      const intent = readTickIntent(args);
      if (!intent) return UNREADABLE;
      return intent.unpushed ? sendQueuedTick(git, intent) : tickPlan(intent);
    },
  };
}

function sendQueuedTick(git: Git, intent: TickIntent): IntentRun {
  const commit = PUSHED_COMMIT.exec(intent.evidence);
  if (!commit?.[1] || !commit[2]) return tickPlan({ ...intent, unpushed: false });
  const pushed = pushCommit(git, commit[1], commit[2]);
  if (pushed.kind === "offline") return { offline: pushed.reason };
  if (pushed.kind === "gone") return () => ({ refused: pushed.reason });
  const { unpushed: _sent, ...sent } = intent;
  return tickPlan(sent);
}
