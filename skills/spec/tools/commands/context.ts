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
import { heldByOthers, type HeldPhases } from "../claims/live";
import { firstUnheld, specsInFlight } from "../context/held-phases";
import { defaultClaudeHome } from "../sessions/live";
import { systemClaimsHere, type ClaimsHereReader } from "../context/claims-here";

const DOCTOR_LINES = 6;
const PACK_MODES = new Set(["resume", "status", "execute", "route"]);
const INFERRING_MODES = new Set(["resume", "status", "execute"]);
const CONVERSATION_FIRST = "If this conversation already resumed or executed another spec, use that one instead (re-run `spec.ts context <mode> <that spec>`).";
const NOTHING_HERE = "No spec named, and nothing in this tree points at one (no claim here, no changed spec files).";
const OFFER_TOP_READY = "If this conversation already resumed or executed a spec, use that one. Otherwise run `spec.ts board ready --json --local`, offer its top row (focus specs rank first) as `<spec> <phase> — <title>`, and start it on a yes.";

export type HeldReader = (projectDir: string) => HeldPhases;

const systemHeldReader: HeldReader = (projectDir) => heldByOthers(projectDir, { runner: systemRunner, claudeHome: defaultClaudeHome(), env: process.env });

// With no spec named: the conversation first (the session's call), then this tree's claim, then its
// changed spec files, and only then the board's top ready row (execute).
export function contextPack(
  projectDir: string,
  request: ContextRequest,
  runner: Runner = systemRunner,
  readHeld: HeldReader = systemHeldReader,
  readClaimsHere: ClaimsHereReader = systemClaimsHere,
): string {
  if (!PACK_MODES.has(request.mode)) return "";
  if (request.name) return specPack(projectDir, request, request.name, undefined, readHeld);
  if (!INFERRING_MODES.has(request.mode)) return "";

  const [claim, ...otherClaims] = readClaimsHere(projectDir);
  if (claim && otherClaims.every(({ spec }) => spec === claim.spec)) {
    const hinted = { ...request, hint: request.hint ?? claim.phase };
    return specPack(projectDir, hinted, claim.spec, `this tree's claim on phase ${claim.phase}`, readHeld);
  }

  const candidates = specsInPlay(projectDir, runner);
  if (candidates === undefined) return "";
  const [only] = candidates;
  if (only !== undefined && candidates.length === 1) return specPack(projectDir, request, only, "changed files", readHeld);
  if (candidates.length === 0) return request.mode === "execute" ? `${NOTHING_HERE} ${OFFER_TOP_READY}` : `${NOTHING_HERE} Infer it from the conversation.`;
  return `No spec named; the changed files belong to ${candidates.join(", ")}. Ask which one.`;
}

function specPack(projectDir: string, request: ContextRequest, name: string, inferredFrom: string | undefined, readHeld: HeldReader): string {
  const specs = findSpecs(projectDir, name);
  if (specs.length !== 1 || !specs[0]) return "";

  const state = loadSpecState(specs[0]);
  const hasLedger = existsSync(join(state.spec.dir, "ledger", "INDEX.md"));
  if (!state.hasProgress || !hasLedger) return "";

  const doctor = doctorReport(projectDir, name).split("\n").slice(0, DOCTOR_LINES).join("\n");
  const mode = request.mode === "route" ? "resume" : request.mode;
  const nodes = loadNodes(projectDir);
  const held = readHeld(projectDir);
  const relations = neighborhoodReport(nodes, state.spec.name, projectDir, specsInFlight(held, state.spec.name));
  const ready = readySet(state, nodes);
  const playbooks = playbooksForSpec(projectDir, state.spec);
  const settings = settingsLine(projectDir);
  const body = mode === "execute"
    ? executeBody(projectDir, { state, doctor, relations, ready, held, playbooks, settings, lessons: loadProjectLessons(projectDir) }, request.hint)
    : resumePack({ state, doctor, relations, ready, held, playbooks, settings, lessons: [] });
  const header = `<spec-pack spec="${state.spec.name}" mode="${mode}"${inferredFrom ? ' inferred="true"' : ""}>`;
  const note = inferredFrom ? `Spec inferred from ${inferredFrom}. ${CONVERSATION_FIRST} Otherwise say which spec you are working on in one line, then carry on.\n\n` : "";
  return `${header}\n${note}${body}\n</spec-pack>`;
}

function executeBody(projectDir: string, input: PackInput, hint: string | undefined): string {
  const { state } = input;
  const hinted = hint ? phaseForHint(state, hint) : undefined;
  const unheld = firstUnheld(state.spec.name, input.ready.ready, input.held);
  const phase = hinted ?? unheld.phase;
  if (!phase && unheld.skipped.length > 0) return `Every ready phase is in flight in another session: ${unheld.skipped.join(", ")}. Tell the user and stop.`;
  if (!phase) return noPhaseReady(input);
  const others = input.ready.ready.length - unheld.skipped.length > 1 ? "first ready phase; others are ready too" : "first ready phase";
  const fallback = unheld.skipped.length > 0 ? `${others}; skipped ${unheld.skipped.join(", ")}` : others;
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
