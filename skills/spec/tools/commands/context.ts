import { existsSync } from "node:fs";
import { join } from "node:path";
import { samePhase } from "../core/phase-title";
import { findSpecs } from "../core/spec-folders";
import { firstOpenPhase, loadSpecState, type SpecState } from "../core/spec-state";
import { executePack, resumePack } from "../context/packs";
import { loadProjectLessons, type Lesson } from "../lessons/project-ledger";
import { doctorReport } from "./doctor";

export interface ContextRequest {
  mode: string;
  name?: string;
  hint?: string;
}

const SUB_COMMANDS = new Set(["prep", "create", "resume", "execute", "review", "update", "handoff", "status", "list"]);
const DOCTOR_LINES = 6;

export function parseContextRequest(argv: readonly string[]): ContextRequest {
  const tokens = argv.flatMap((arg) => arg.split(/\s+/)).filter(Boolean);
  const first = tokens[0]?.toLowerCase();
  const last = tokens.at(-1)?.toLowerCase();
  if (first && SUB_COMMANDS.has(first)) return { mode: first, name: tokens[1], hint: tokens.slice(2).join(" ") || undefined };
  if (last && SUB_COMMANDS.has(last)) return { mode: last, name: tokens[0] };
  return { mode: "route", name: tokens[0] };
}

export function contextPack(projectDir: string, request: ContextRequest): string {
  if (!request.name || !["resume", "status", "execute", "route"].includes(request.mode)) return "";
  const specs = findSpecs(projectDir, request.name);
  if (specs.length !== 1 || !specs[0]) return "";

  const state = loadSpecState(specs[0]);
  const hasLedger = existsSync(join(state.spec.dir, "ledger", "INDEX.md"));
  if (!state.hasProgress || !hasLedger) return "";

  const doctor = doctorReport(projectDir, request.name).split("\n").slice(0, DOCTOR_LINES).join("\n");
  const mode = request.mode === "route" ? "resume" : request.mode;
  const body = mode === "execute"
    ? executeBody(state, doctor, loadProjectLessons(projectDir), request.hint)
    : resumePack({ state, doctor, lessons: [] });
  return `<spec-pack spec="${state.spec.name}" mode="${mode}">\n${body}\n</spec-pack>`;
}

function executeBody(state: SpecState, doctor: string, lessons: readonly Lesson[], hint: string | undefined): string {
  const hinted = hint ? phaseForHint(state, hint) : undefined;
  const phase = hinted ?? firstOpenPhase(state);
  if (!phase) return "All phases complete — see pr-opening.md for the PR gate.";
  const note = hinted ? `from your hint "${hint}"` : hint ? `hint "${hint}" matched no phase; first open phase` : "first open phase";
  return executePack({ state, doctor, lessons }, phase, note);
}

function phaseForHint(state: SpecState, hint: string) {
  const id = hint.replace(/^phase\s+/i, "").trim();
  if (id.toLowerCase() === "next") return undefined;
  return state.phases.find((phase) => samePhase(phase.id, id));
}
