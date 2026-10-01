import { existsSync } from "node:fs";
import { join } from "node:path";
import { samePhase } from "../core/phase-title";
import { findSpecs } from "../core/spec-folders";
import { loadSpecState, type SpecState } from "../core/spec-state";
import { executePack, resumePack, type PackInput } from "../context/packs";
import { renderReadySet } from "../ready/render";
import { neighborhoodReport } from "./graph";
import { loadNodes } from "../graph/nodes";
import { readySet } from "../ready/ready-set";
import { loadProjectLessons } from "../lessons/project-ledger";
import { doctorReport } from "./doctor";
import { playbooksForSpec } from "../playbook/playbooks";
import { describeSettings, loadSettings } from "../playbook/settings";
import { normalizePhaseHint, type ContextRequest } from "../context/request";
import { specsInPlay } from "../context/infer-spec";
import { systemRunner, type Runner } from "../core/run";

const DOCTOR_LINES = 6;
const PACK_MODES = new Set(["resume", "status", "execute", "route"]);
const INFERRING_MODES = new Set(["resume", "status", "execute"]);
const INFERRED_NOTE = "Spec inferred from changed files: say which spec you are working on in one line, then carry on.";

export function contextPack(projectDir: string, request: ContextRequest, runner: Runner = systemRunner): string {
  if (!PACK_MODES.has(request.mode)) return "";
  if (request.name) return specPack(projectDir, request, request.name, false);
  if (!INFERRING_MODES.has(request.mode)) return "";

  const candidates = specsInPlay(projectDir, runner);
  if (candidates === undefined) return "";
  const [only] = candidates;
  if (only !== undefined && candidates.length === 1) return specPack(projectDir, request, only, true);
  if (candidates.length === 0) return "No spec named, and no changed file belongs to a spec. Infer it from the conversation.";
  return `No spec named; the changed files belong to ${candidates.join(", ")}. Ask which one.`;
}

function specPack(projectDir: string, request: ContextRequest, name: string, inferred: boolean): string {
  const specs = findSpecs(projectDir, name);
  if (specs.length !== 1 || !specs[0]) return "";

  const state = loadSpecState(specs[0]);
  const hasLedger = existsSync(join(state.spec.dir, "ledger", "INDEX.md"));
  if (!state.hasProgress || !hasLedger) return "";

  const doctor = doctorReport(projectDir, name).split("\n").slice(0, DOCTOR_LINES).join("\n");
  const mode = request.mode === "route" ? "resume" : request.mode;
  const nodes = loadNodes(projectDir);
  const relations = neighborhoodReport(nodes, state.spec.name, projectDir);
  const ready = readySet(state, nodes);
  const playbooks = playbooksForSpec(projectDir, state.spec);
  const settings = settingsLine(projectDir);
  const body = mode === "execute"
    ? executeBody(projectDir, { state, doctor, relations, ready, playbooks, settings, lessons: loadProjectLessons(projectDir) }, request.hint)
    : resumePack({ state, doctor, relations, ready, playbooks, settings, lessons: [] });
  const header = `<spec-pack spec="${state.spec.name}" mode="${mode}"${inferred ? ' inferred="true"' : ""}>`;
  return `${header}\n${inferred ? `${INFERRED_NOTE}\n\n` : ""}${body}\n</spec-pack>`;
}

function executeBody(projectDir: string, input: PackInput, hint: string | undefined): string {
  const { state } = input;
  const hinted = hint ? phaseForHint(state, hint) : undefined;
  const phase = hinted ?? input.ready.ready[0];
  if (!phase) return noPhaseReady(input);
  const fallback = input.ready.ready.length > 1 ? "first ready phase; others are ready too" : "first ready phase";
  const note = hinted ? `from your hint "${hint}"` : hint ? `hint "${hint}" matched no phase; ${fallback}` : fallback;
  const playbooks = phase.playbook ? playbooksForSpec(projectDir, state.spec, phase.playbook) : input.playbooks;
  return executePack({ ...input, playbooks }, phase, note);
}

function settingsLine(projectDir: string): string | undefined {
  const settings = loadSettings(projectDir);
  return settings.file ? `Settings: ${describeSettings(settings)}` : undefined;
}

function noPhaseReady(input: PackInput): string {
  if (input.ready.waiting.length === 0) return "All phases complete — see pr-opening.md for the PR gate.";
  return `No phase is ready to start.\n${renderReadySet(input.ready)}\nTell the user what blocks the spec and stop.`;
}

function phaseForHint(state: SpecState, hint: string) {
  const id = normalizePhaseHint(hint);
  if (id.toLowerCase() === "next") return undefined;
  return state.phases.find((phase) => samePhase(phase.id, id));
}
