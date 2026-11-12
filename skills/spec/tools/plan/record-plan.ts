import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { SpecFolder } from "../core/spec-folders";
import { phaseFileText } from "../phases/template";
import { serializeDoc } from "../record/document";
import { viewOfTexts } from "../record/view";
import type { RecordPlan } from "../record/write";
import type { PhaseDoc } from "./docs/phase-doc";
import { phaseDocPath, specDocPath } from "./kinds";
import type { ChangeSeen } from "./ops/change";
import type { PlanCommand } from "./plan-intents";
import type { PhaseOutcome } from "./phase-writer";
import { NO_ORIGIN, sendRecordIntent, storeRefusal, type RecordWorld } from "./record-send";
import type { JoinedPlan } from "./state-source";

// The intent as it is queued, and its plan watched through `see`.
export interface PlannedIntent {
  command: PlanCommand;
  args: object;
  plan(see: (seen: ChangeSeen) => void): RecordPlan;
}

// A plan change or a phase's state, sent as an intent. It is first planned against the record this command
// read, so a request that can't hold says so (`phase <action>: …`) before anything is sent; the send plans
// it again at the tip.
export async function recordPlanCommand(world: RecordWorld, spec: SpecFolder, joined: JoinedPlan, intent: PlannedIntent): Promise<PhaseOutcome> {
  const { command } = intent;
  let local: ChangeSeen | undefined;
  const dryRun = intent.plan((seen) => (local = seen))(viewOfPlan(joined));
  if ("refused" in dryRun) return { kind: "invalid", reason: dryRun.refused };
  let seen: ChangeSeen | undefined;
  const written = await sendRecordIntent(world, command, intent.args, intent.plan((each) => (seen = each)));
  if (!written) return NO_ORIGIN;
  switch (written.kind) {
    case "landed":
      return { kind: "landed", line: withProse(spec, seen ?? local, command) };
    case "unchanged":
      return { kind: "unchanged", line: (seen ?? local)?.line ?? `${command}: nothing to change` };
    case "queued":
      withProse(spec, local, command);
      return { kind: "queued", pending: written.pending };
    default:
      return storeRefusal(written, `run phase ${command} again`);
  }
}

function viewOfPlan(plan: JoinedPlan) {
  const docs: [string, unknown][] = [[specDocPath(plan.spec.name), plan.spec], ...plan.phases.map((phase): [string, unknown] => [phaseDocPath(plan.spec.name, phase.id), phase])];
  return viewOfTexts(new Map(docs.map(([path, doc]) => [path, serializeDoc(doc)])), { kind: "at", sha: "local" });
}

// A new phase's prose stays a file: its template, with the tasks left to the board.
function withProse(spec: SpecFolder, seen: ChangeSeen | undefined, command: string): string {
  const line = seen?.line ?? `${command}: done`;
  const written = (seen?.added ?? []).filter((phase) => writeProse(spec, phase));
  if (written.length === 0) return line;
  return `${line}\nWrote ${written.map((phase) => phase.file).join(", ")}: fill in the Goal, Outcome and files to touch, and commit.`;
}

function writeProse(spec: SpecFolder, phase: PhaseDoc): boolean {
  const file = join(spec.dir, phase.file);
  if (existsSync(file)) return false;
  mkdirSync(dirname(file), { recursive: true });
  const edges = { needs: phase.needs, needsDeployed: phase.needsDeployed, sameFilesAs: phase.sameFilesAs, pr: phase.pr, code: phase.code ? undefined : false };
  writeFileSync(file, phaseFileText({ id: phase.id, title: phase.title, edges, onBoard: true }));
  return true;
}
