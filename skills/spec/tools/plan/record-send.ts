import { hostname } from "node:os";
import { basename } from "node:path";
import { gitAt, gitCommonDir, type Git } from "../core/git";
import { defaultBranch } from "../core/run";
import { outboxDir, sendIntent, type IntentRunners, type RecordWrite } from "../record/outbox";
import { gitRecordPort, type RecordPort } from "../record/ref";
import type { RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import { sessionFactsOf } from "../sessions/facts";
import { ownSessionId } from "../sessions/own";
import { withStamp, type SessionFacts } from "../sessions/stamp";
import { intentRunners } from "./intents";
import { validateRecordDoc } from "./kinds";
import type { PhaseDeps, PhaseOutcome } from "./phase-writer";

// What a command writing the record needs from this checkout.
export interface RecordWorld {
  git: Git;
  defaultBranch?: string;
  port?: RecordPort;
  outbox?: string;
  session?: string;
  tree: string;
  now: Date;
  runners: IntentRunners;
  // What this session stamps on its document, read from the checkout once, on the first write.
  sessionFacts: () => SessionFacts | undefined;
  // Shown each record the write planned against; the last one is the tip it landed on.
  watch?: (view: RecordView) => void;
}

export const NO_ORIGIN: PhaseOutcome = { kind: "refused", reason: "This repo has no origin; the board's record lives there." };

export function recordWorld(projectDir: string, deps: PhaseDeps): RecordWorld {
  const git = gitAt(projectDir, deps.runner);
  const common = gitCommonDir(git);
  const top = git.out(["rev-parse", "--show-toplevel"]);
  const branch = defaultBranch(projectDir, deps.runner);
  const port = gitRecordPort(git);
  const session = ownSessionId(deps.env);
  const tree = basename(top.ok ? top.value : projectDir);
  return {
    git,
    ...(branch ? { defaultBranch: branch } : {}),
    ...(port ? { port } : {}),
    ...(common.ok ? { outbox: outboxDir(common.value) } : {}),
    ...(session ? { session } : {}),
    tree,
    now: deps.now(),
    runners: intentRunners(git),
    sessionFacts: once(() => sessionFactsOf(git, deps.env, tree, hostname())),
  };
}

function once<T>(read: () => T): () => T {
  let value: { read: T } | undefined;
  return () => (value ??= { read: read() }).read;
}

// One intent, sent after anything queued before it; `plan` is the caller's own run of it, so it can watch
// what the plan saw at the tip.
export async function sendRecordIntent(world: RecordWorld, command: string, args: unknown, plan: RecordPlan): Promise<RecordWrite | undefined> {
  if (!world.port || !world.outbox) return undefined;
  const { watch } = world;
  const watched: RecordPlan = watch ? (view) => (watch(view), plan(view)) : plan;
  const stamped = withStamp(watched, world.sessionFacts, world.now);
  return sendIntent(world.port, world.outbox, { session: world.session, command, args }, world.runners, { validate: validateRecordDoc }, world.now, stamped);
}

// The store's refusals, as one command line: `<action>: refused, nothing written. <reason>`.
export function storeRefusal(written: Extract<RecordWrite, { kind: "refused" | "failed" | "invalid" | "conflict" }>, retry: string): PhaseOutcome {
  if (written.kind === "invalid") return { kind: "refused", reason: written.problems.join("; ") };
  if (written.kind === "conflict") return { kind: "refused", reason: `${written.path} changed while it was written; ${retry}.` };
  return { kind: "refused", reason: written.reason };
}
