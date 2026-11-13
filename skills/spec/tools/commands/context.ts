import { existsSync } from "node:fs";
import { join } from "node:path";
import { findSpecs, type SpecFolder } from "../core/spec-folders";
import { diskReader } from "../core/spec-state";
import { planShapeOf } from "../plan/plan-diff";
import { noticePlanChange, planMemoryFor, type PlanMemory } from "../plan/plan-version";
import { readPlansAt, type PlanSource } from "../plan/read-plans";
import { boardLine, treeAheadLine } from "../context/board-lines";
import { babysitPack } from "../context/babysit-pack";
import { executePack, resumePack, type PackInput } from "../context/packs";
import { neighborhoodReport } from "./graph";
import { loadNodes } from "../graph/nodes";
import { readySet } from "../ready/ready-set";
import { loadProjectLessons } from "../lessons/project-ledger";
import { doctorReport } from "./doctor";
import { playbooksForSpec } from "../playbook/playbooks";
import { describeSettings, loadSettings } from "../playbook/settings";
import type { ContextRequest } from "../context/request";
import { specsInPlay } from "../context/infer-spec";
import { systemRunner, type Runner } from "../core/run";
import { heldByOthers, type HeldPhases } from "../claims/live";
import { specsInFlight } from "../context/held-phases";
import { defaultClaudeHome } from "../sessions/live";
import { systemClaimsHere, type ClaimsHereReader } from "../context/claims-here";
import { loadPackReferences } from "../context/references";
import { selectExecutePhase } from "../context/select-phase";
import { coverLines, coveringCards } from "../cards/cover";
import type { Env } from "../core/env";
import { sessionLine, sessionsOnSpec } from "../sessions/list";
import { claudeSessionRef } from "../sessions/session-doc";
import { recordViewOf } from "../record/read";
import type { LocalPilot } from "../runtime/workflow-capabilities";

const DOCTOR_LINES = 6;
const PACK_MODES = new Set(["resume", "status", "execute", "route", "babysit"]);
const INFERRING_MODES = new Set(["resume", "status", "execute"]);
const CONVERSATION_FIRST = "If this conversation already resumed or executed another spec, use that one instead (re-run `spec.ts context <mode> <that spec>`).";
const NOTHING_HERE = "No spec named, and nothing in this tree points at one (no claim here, no changed spec files).";
const APPLY_TOP_READY =
  "If this conversation already resumed or executed a spec, use that one. Otherwise run `spec.ts board ready --for me --json --local` (your work and unowned work), take its top row (focus specs rank first) and run its `next` sub-command for that spec (with the phase for execute) in this session. Say so in one line, `<next> <spec> [<phase>] — <title>`, under `Say if wrong:`.";

export type HeldReader = (projectDir: string) => HeldPhases | Promise<HeldPhases>;

export interface ContextDeps {
  runner: Runner;
  readHeld: HeldReader;
  readClaimsHere: ClaimsHereReader;
  workflow?: LocalPilot;
  env?: Env;
  now?: () => Date;
  memory?: PlanMemory;
}

export function systemContextDeps(): ContextDeps {
  const memory = planMemoryFor(process.env);
  return {
    runner: systemRunner,
    readHeld: (projectDir) => heldByOthers(projectDir, { runner: systemRunner, claudeHome: defaultClaudeHome(), env: process.env }),
    readClaimsHere: systemClaimsHere,
    env: process.env,
    ...(memory ? { memory } : {}),
  };
}

export async function contextPack(
  projectDir: string,
  request: ContextRequest,
  deps: ContextDeps = systemContextDeps(),
): Promise<string> {
  if (!PACK_MODES.has(request.mode)) return "";
  if (request.name) return specPack(projectDir, request, { name: request.name }, deps);
  if (!INFERRING_MODES.has(request.mode)) return "";

  const [claim, ...otherClaims] = deps.readClaimsHere(projectDir);
  if (claim && otherClaims.every(({ spec }) => spec === claim.spec)) {
    const hinted = { ...request, hint: request.hint ?? claim.phase };
    return specPack(projectDir, hinted, { name: claim.spec, inferredFrom: `this tree's claim on phase ${claim.phase}` }, deps);
  }

  const candidates = specsInPlay(projectDir, deps.runner);
  if (candidates === undefined) return "";
  const [only] = candidates;
  if (only !== undefined && candidates.length === 1) return specPack(projectDir, request, { name: only, inferredFrom: "changed files" }, deps);
  if (candidates.length === 0) return request.mode === "execute" ? `${NOTHING_HERE} ${APPLY_TOP_READY}` : `${NOTHING_HERE} Infer it from the conversation.`;
  return `No spec named; the changed files belong to ${candidates.join(", ")}. Ask which one.`;
}

async function specPack(projectDir: string, request: ContextRequest, target: { name: string; inferredFrom?: string }, deps: ContextDeps): Promise<string> {
  const { name, inferredFrom } = target;
  const specs = findSpecs(projectDir, name);
  if (specs.length !== 1 || !specs[0]) return "";

  const plans = readPlansAt(projectDir, deps.runner, deps.now?.() ?? new Date());
  const state = plans.state(specs[0]);
  const hasLedger = existsSync(join(state.spec.dir, "ledger", "INDEX.md"));
  if (!state.hasProgress || !hasLedger) return "";

  const doctor = doctorReport(projectDir, name, deps.runner, plans).split("\n").slice(0, DOCTOR_LINES).join("\n");
  const mode = request.mode === "route" ? "resume" : request.mode;
  const block = (body: string) => packBlock(state.spec.name, mode, inferredFrom, withBoardLines(plans, state.spec, body, deps));
  if (mode === "babysit") return block(babysitPack({ state, doctor, settings: settingsLine(projectDir) }, request.hint));
  const nodes = loadNodes(projectDir, plans);
  const held = await deps.readHeld(projectDir);
  const relations = neighborhoodReport(nodes, state.spec.name, projectDir, specsInFlight(held, state.spec.name));
  const ready = readySet(state, nodes);
  const playbooks = playbooksForSpec(projectDir, state.spec);
  const settings = settingsLine(projectDir);
  const stale = nodes.get(state.spec.name)?.meta.stale;
  const body = mode === "execute"
    ? executeBody(projectDir, { state, doctor, relations, ready, held, playbooks, settings, stale, workflow: deps.workflow, lessons: loadProjectLessons(projectDir) }, request.hint)
    : resumePack({ state, doctor, relations, ready, held, playbooks, settings, stale, lessons: [] });
  return block(body);
}

function withBoardLines(plans: PlanSource, spec: SpecFolder, body: string, deps: ContextDeps): string {
  const { memory } = deps;
  const joined = plans.joined(spec.name);
  const lines = [
    boardLine(plans.record, joined, plans.pending),
    joined && memory ? noticePlanChange(memory, spec.name, planShapeOf(joined)) : undefined,
    joined ? treeAheadLine(joined, diskReader(spec.dir)) : undefined,
    ...cardLinesFor(plans, spec.name),
    ...sessionLinesFor(plans, spec.name, deps),
  ].filter((line) => line !== undefined);
  return lines.length === 0 ? body : `${lines.join("\n")}\n\n${body}`;
}

// Why the work exists, in the customer's words: the open cards that cover this spec.
function cardLinesFor(plans: PlanSource, spec: string): string[] {
  const view = recordViewOf(plans.record);
  return view ? coverLines(coveringCards(view, spec), spec) : [];
}

// Who else is on this spec, from the sessions' own documents: a review or prep takes no claim.
function sessionLinesFor(plans: PlanSource, spec: string, deps: ContextDeps): string[] {
  const view = recordViewOf(plans.record);
  if (!view) return [];
  const now = deps.now?.() ?? new Date();
  const own = deps.env ? claudeSessionRef(deps.env) : undefined;
  const planVersion = plans.joined(spec)?.spec.planVersion;
  return sessionsOnSpec(view, spec, own, now).map((doc) => sessionLine(doc, now, planVersion));
}

function packBlock(spec: string, mode: string, inferredFrom: string | undefined, body: string): string {
  const header = `<spec-pack spec="${spec}" mode="${mode}"${inferredFrom ? ' inferred="true"' : ""}>`;
  const note = inferredFrom ? `Spec inferred from ${inferredFrom}. ${CONVERSATION_FIRST} Otherwise say which spec you are working on in one line, then carry on.\n\n` : "";
  return `${header}\n${note}${body}\n</spec-pack>`;
}

function executeBody(projectDir: string, input: PackInput, hint: string | undefined): string {
  const selected = selectExecutePhase(input, hint);
  if (!selected.ok) return selected.reason;
  const { phase, note } = selected.value;
  const playbooks = phase.playbook ? playbooksForSpec(projectDir, input.state.spec, phase.playbook) : input.playbooks;
  const references = loadPackReferences(diskReader(input.state.spec.dir));
  return executePack({ ...input, playbooks }, phase, note, references);
}

function settingsLine(projectDir: string): string | undefined {
  const settings = loadSettings(projectDir);
  return settings.file ? `Settings: ${describeSettings(settings)}` : undefined;
}
