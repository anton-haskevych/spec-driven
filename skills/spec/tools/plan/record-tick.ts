import { basename } from "node:path";
import { gitAt, gitCommonDir, type Git } from "../core/git";
import { isGateItem } from "../core/gate";
import { defaultBranch } from "../core/run";
import { checkEvidence, type TickRequest } from "../phases/tick";
import { pushBranch, SAVE, unsavedCodePaths } from "../publish/push";
import { listOutbox, outboxDir, queueIntent, sendIntent, type IntentRunners, type RecordWrite } from "../record/outbox";
import { gitRecordPort, type RecordPort } from "../record/ref";
import { ownSessionId } from "../sessions/own";
import type { PhaseDoc, Task } from "./docs/phase-doc";
import { intentRunners } from "./intents";
import { validateRecordDoc } from "./kinds";
import { closedBySameSession, closedLine, findTask, tickPlan, type TickIntent, type TickSeen } from "./ops/tick";
import type { PhaseDeps, PhaseOutcome } from "./phase-writer";
import type { JoinedPlan } from "./state-source";

export interface TickWorld {
  git: Git;
  defaultBranch?: string;
  port?: RecordPort;
  outbox?: string;
  session?: string;
  tree: string;
  now: Date;
  runners: IntentRunners;
}

type TickBase = Omit<TickIntent, "evidence">;

const SHA = /^([0-9a-f]{7})[0-9a-f]{33}\b/;

export function tickWorld(projectDir: string, deps: PhaseDeps): TickWorld {
  const git = gitAt(projectDir, deps.runner);
  const common = gitCommonDir(git);
  const top = git.out(["rev-parse", "--show-toplevel"]);
  const branch = defaultBranch(projectDir, deps.runner);
  const port = gitRecordPort(git);
  const session = ownSessionId(deps.env);
  return {
    git,
    ...(branch ? { defaultBranch: branch } : {}),
    ...(port ? { port } : {}),
    ...(common.ok ? { outbox: outboxDir(common.value) } : {}),
    ...(session ? { session } : {}),
    tree: basename(top.ok ? top.value : projectDir),
    now: deps.now(),
    runners: intentRunners(git),
  };
}

// A code task is saved before it is recorded: push, then mark it done with the pushed commit. A task phase's
// item or a Gate: item carries the evidence it was given instead.
export async function recordTick(world: TickWorld, spec: string, joined: JoinedPlan, request: TickRequest): Promise<PhaseOutcome> {
  const found = findTask(joined, request.phase, request.selector);
  if (!found) return { kind: "invalid", reason: unknownTask(spec, joined, request) };
  const { phase, task } = found;
  const base: TickBase = { spec, phase: phase.id, task: task.id, at: world.now.toISOString(), tree: world.tree, ...(world.session ? { session: world.session } : {}) };
  if (task.done) return doneAlready(task, base);
  if (!phase.code || task.gate || isGateItem(task.text)) {
    const problem = checkEvidence({ id: phase.id, code: phase.code }, task.text, request.evidence);
    if (problem !== undefined || request.evidence === undefined) return { kind: "invalid", reason: problem ?? `${task.id} needs --evidence` };
    return send(world, { ...base, evidence: request.evidence }, "");
  }
  return saveThenSend(world, base, request.evidence);
}

async function saveThenSend(world: TickWorld, base: TickBase, note: string | undefined): Promise<PhaseOutcome> {
  if (!world.defaultBranch) return { kind: "refused", reason: "Can't tell the default branch (no origin/HEAD, no gh), so the branch wasn't pushed." };
  const pushed = pushBranch(world.git, world.defaultBranch, SAVE);
  if (pushed.kind === "refused") return { kind: "refused", reason: `Couldn't push: ${pushed.reason}. Push it, then tick again.` };
  if (pushed.kind === "rejected") return { kind: "refused", reason: `Couldn't push ${pushed.branch}: ${pushed.reason}. Push it, then tick again.` };
  const head = world.git.out(["rev-parse", "HEAD"]);
  if (!head.ok) return { kind: "refused", reason: head.reason };
  const intent = { ...base, evidence: `${head.value} on origin/${pushed.branch}${note ? ` · ${note}` : ""}` };
  if (pushed.kind === "offline") return queue(world, { ...intent, unpushed: true });
  const unsaved = unsavedCodePaths(world.git).length;
  return send(world, intent, unsaved === 0 ? "" : ` · ${unsaved} edited ${unsaved === 1 ? "file is" : "files are"} not in this commit`);
}

async function send(world: TickWorld, intent: TickIntent, tail: string): Promise<PhaseOutcome> {
  if (!world.port || !world.outbox) return { kind: "refused", reason: "This repo has no origin; the board's record lives there." };
  let seen: TickSeen | undefined;
  const plan = tickPlan(intent, (each) => (seen = each));
  const written = await sendIntent(world.port, world.outbox, { session: world.session, command: "tick", args: intent }, world.runners, { validate: validateRecordDoc }, world.now, plan);
  return outcomeOf(written, seen, intent, tail);
}

function queue(world: TickWorld, intent: TickIntent): PhaseOutcome {
  if (!world.outbox) return { kind: "refused", reason: "Can't find this clone's git folder to keep the tick in." };
  queueIntent(world.outbox, { session: world.session, command: "tick", args: intent }, world.now);
  return { kind: "queued", pending: listOutbox(world.outbox).length };
}

function outcomeOf(written: RecordWrite, seen: TickSeen | undefined, intent: TickIntent, tail: string): PhaseOutcome {
  switch (written.kind) {
    case "landed":
      return seen?.kind === "ticked" ? { kind: "landed", line: tickedLine(seen, intent, tail) } : { kind: "landed", line: `tick: ${intent.task} done` };
    case "unchanged":
      return { kind: "unchanged", line: `tick: ${intent.task} is already done (${evidenceLabel(seen?.kind === "already" ? seen.task.evidence : intent.evidence)})` };
    case "queued":
      return { kind: "queued", pending: written.pending };
    case "refused":
    case "failed":
      return { kind: "refused", reason: written.reason };
    case "invalid":
      return { kind: "refused", reason: written.problems.join("; ") };
    case "conflict":
      return { kind: "refused", reason: `${written.path} changed while it was written; tick again.` };
  }
}

function tickedLine(seen: Extract<TickSeen, { kind: "ticked" }>, intent: TickIntent, tail: string): string {
  const moved = seen.phase === intent.phase ? "" : ` · ${seen.task} is now in phase ${seen.phase}`;
  const line = `tick: phase ${seen.phase} · ${seen.task} done (${evidenceLabel(intent.evidence)})${moved}${tail}`;
  return seen.phaseComplete ? `${line}\nPhase ${seen.phase} complete — run update.md → Close the phase` : line;
}

function doneAlready(task: Task, base: TickBase): PhaseOutcome {
  if (closedBySameSession(task, base)) return { kind: "unchanged", line: `tick: ${task.id} is already done (${evidenceLabel(task.evidence)})` };
  return { kind: "refused", reason: `${closedLine(task, base.at)}.` };
}

function unknownTask(spec: string, joined: JoinedPlan, request: TickRequest): string {
  const phase: PhaseDoc | undefined = joined.phases.find((each) => each.id === request.phase);
  const open = (phase?.tasks ?? []).filter((task) => !task.done);
  const where = phase ? `phase ${phase.id}` : spec;
  const list = open.length === 0 ? "No open tasks." : `Open tasks:\n${open.map((task) => `${task.id} ${task.text}`).join("\n")}`;
  return `no task "${request.selector}" in ${where}; ${spec} is on the board, where a task is named by its id. ${list}`;
}

function evidenceLabel(evidence: string | undefined): string {
  return (evidence ?? "").replace(SHA, "$1");
}
