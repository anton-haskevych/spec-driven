import { isGateItem } from "../core/gate";
import { checkEvidence, type TickRequest } from "../phases/tick";
import { pushBranch, SAVE, unsavedCodePaths } from "../publish/push";
import { listOutbox, queueIntent, type RecordWrite } from "../record/outbox";
import type { PhaseDoc, Task } from "./docs/phase-doc";
import { closedBySameSession, closedLine, findTask, tickPlan, type TickIntent, type TickSeen } from "./ops/tick";
import type { PhaseDeps, PhaseOutcome } from "./phase-writer";
import { NO_ORIGIN, sendRecordIntent, storeRefusal, type RecordWorld } from "./record-send";
import type { JoinedPlan } from "./state-source";
import { approvalEvidence, approvalOf } from "../questions/gate";
import { answererOf } from "../questions/who";

type TickBase = Omit<TickIntent, "evidence">;

const SHA = /^([0-9a-f]{7})[0-9a-f]{33}\b/;

// A code task is saved before it is recorded: push, then mark it done with the pushed commit. A task phase's
// item or a Gate: item carries the evidence it was given instead.
export async function recordTick(world: RecordWorld, spec: string, joined: JoinedPlan, request: TickRequest): Promise<PhaseOutcome> {
  const found = findTask(joined, request.phase, request.selector);
  if (!found) return { kind: "invalid", reason: unknownTask(spec, joined, request) };
  const { phase, task } = found;
  const base: TickBase = { spec, phase: phase.id, task: task.id, at: world.now.toISOString(), tree: world.tree, ...(world.session ? { session: world.session } : {}) };
  if (task.done) return doneAlready(task, base);
  if (task.gate || isGateItem(task.text)) return tickGate(world, joined, base, task, request.evidence);
  if (!phase.code) {
    const problem = checkEvidence({ id: phase.id, code: phase.code }, task.text, request.evidence);
    if (problem !== undefined || request.evidence === undefined) return { kind: "invalid", reason: problem ?? `${task.id} needs --evidence` };
    return send(world, { ...base, evidence: request.evidence }, "");
  }
  return saveThenSend(world, base, request.evidence);
}

// A Gate: task pushes nothing. Its evidence is the approval given now, recorded as its answered gate question,
// or the answer its gate question already holds.
function tickGate(world: RecordWorld, joined: JoinedPlan, base: TickBase, task: Task, evidence: string | undefined): Promise<PhaseOutcome> | PhaseOutcome {
  if (evidence === undefined) {
    const approval = approvalOf(joined, base.phase, task.id);
    if (!approval) return { kind: "invalid", reason: `"${task.text}" records an approval; answer its gate question (phase unpark) or tick it with --evidence "<who approved, when>"` };
    return send(world, { ...base, evidence: approvalEvidence(approval) }, "");
  }
  const problem = checkEvidence({ id: base.phase, code: true }, task.text, evidence);
  if (problem !== undefined) return { kind: "invalid", reason: problem };
  return send(world, { ...base, evidence, approval: { text: evidence, by: answererOf(world.git), at: base.at } }, "");
}

async function saveThenSend(world: RecordWorld, base: TickBase, note: string | undefined): Promise<PhaseOutcome> {
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

async function send(world: RecordWorld, intent: TickIntent, tail: string): Promise<PhaseOutcome> {
  let seen: TickSeen | undefined;
  const written = await sendRecordIntent(world, "tick", intent, tickPlan(intent, (each) => (seen = each)));
  return written ? outcomeOf(written, seen, intent, tail) : NO_ORIGIN;
}

function queue(world: RecordWorld, intent: TickIntent): PhaseOutcome {
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
    default:
      return storeRefusal(written, "tick again");
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
