import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { outlineMarkdown } from "../core/markdown";
import type { PhaseState, SpecState } from "../core/spec-state";
import type { ReadySet } from "../ready/ready-set";
import { renderReadySet } from "../ready/render";
import type { Lesson } from "../lessons/project-ledger";
import { describeLesson, lessonsForFiles } from "../lessons/recall";
import { codeMapForPhase } from "./code-map";
import { parseLedgerIndex, rowsForPhase } from "./ledger-scope";
import { renderStatusTable } from "./status-table";
import { clip, kilobytes } from "./text";

export interface PackInput {
  state: SpecState;
  doctor: string;
  lessons: readonly Lesson[];
  relations: string;
  ready: ReadySet;
}

const PHASE_ENTRY_LIMIT = 8000;
const SMALL_FILE_LIMIT = 3000;
const IN_FLIGHT_LIMIT = 2000;
const LEDGER_LIMIT = 6000;
const PATH_LIKE = /^[\w@.{}-]+(\/[\w@.{}*-]+)+$/;
const STABLE_REFERENCES = ["design.md", "technical.md"];
const TASK_PHASE_NOTE = "Task phase (code: false): follow execute.md → Task phases. No recon, preflight or TDD; tick each item with its evidence.";

export function resumePack({ state, doctor, relations, ready }: PackInput): string {
  const next = ready.ready[0];
  const nextBlock = next
    ? `### Next chunk: Phase ${next.id} — ${next.name}\n${(next.summary?.nextRun ?? []).map((item) => `- ${item}`).join("\n")}`
    : `### Next chunk\n${ready.waiting.length > 0 ? "No phase is ready; see the ready set." : "All phases complete — see pr-opening.md for the PR gate."}`;
  return [
    "Covers the Stage A reads (progress.md, phase entries, in-flight.md). Do not re-read those files.",
    `### Status table\n${renderStatusTable(state)}`,
    `### Ready set\n${renderReadySet(ready)}`,
    inFlightBlock(state),
    nextBlock,
    `### Related specs\n${relations}`,
    `### Doctor\n${doctor}`,
  ].join("\n\n");
}

export function executePack(input: PackInput, phase: PhaseState, pickNote: string): string {
  const { state, doctor, lessons, relations } = input;
  const read = (name: string) => readTextIfExists(join(state.spec.dir, name));
  return [
    "Covers execute §0.2–§0.3: the picked phase, its ledger rows, its code-map rows, CLAUDE.md and in-flight.md. Do not re-read those files.",
    `Picked: Phase ${phase.id} — ${phase.name} (${pickNote})`,
    ...(phase.code ? [] : [TASK_PHASE_NOTE]),
    `### Ready set\n${renderReadySet(input.ready)}`,
    `### Phase entry (${phase.pointer})\n${clip(phase.entry ?? "(missing)", PHASE_ENTRY_LIMIT, phase.pointer)}`,
    ledgerBlock(read("ledger/INDEX.md"), phase.id),
    codeMapBlock(read("code-map.md"), phase.entry ?? ""),
    projectLessonsBlock(lessons, phase.entry ?? ""),
    `### CLAUDE.md\n${clip(read("CLAUDE.md") ?? "(missing)", SMALL_FILE_LIMIT, "CLAUDE.md")}`,
    stableReferencesBlock(read),
    `### Related specs\n${relations}`,
    inFlightBlock(state),
    `### Doctor\n${doctor}`,
  ].join("\n\n");
}

function inFlightBlock(state: SpecState): string {
  const text = state.inFlight?.trim();
  return `### In-flight (raw)\n${text ? clip(text, IN_FLIGHT_LIMIT, "in-flight.md") : "(none)"}`;
}

function ledgerBlock(index: string | undefined, phaseId: string): string {
  if (index === undefined) return "### Ledger\n(no ledger/INDEX.md)";
  const { rows, unparsed } = parseLedgerIndex(index);
  const matching = rowsForPhase(rows, phaseId);
  const shown = withinBudget(matching.map((row) => row.line), LEDGER_LIMIT);
  const hiddenNote = shown.length < matching.length
    ? `\n${matching.length - shown.length} more [general] rows apply; scan ledger/INDEX.md if this phase touches their topic.`
    : "";
  const unparsedNote = unparsed > 0 ? `\n${unparsed} rows use another format; scan ledger/INDEX.md for them.` : "";
  const body = shown.length > 0 ? shown.join("\n") : "(no rows apply)";
  const heading = `### Ledger rows for phase ${phaseId} (${matching.length} of ${rows.length} apply; load-bearing and phase rows first)`;
  return `${heading}\nOpen only the entries this chunk needs.\n${body}${hiddenNote}${unparsedNote}`;
}

function withinBudget(lines: readonly string[], budget: number): string[] {
  const kept: string[] = [];
  let used = 0;
  for (const line of lines) {
    if (used + line.length > budget) break;
    kept.push(line);
    used += line.length + 1;
  }
  return kept;
}

function codeMapBlock(codeMap: string | undefined, phaseEntry: string): string {
  if (codeMap === undefined) return "### Code map\n(no code-map.md)";
  const slice = codeMapForPhase(codeMap, phaseEntry);
  const label = slice.filtered ? "rows this phase names" : "no rows matched this phase; full table";
  return `### Code map (${label})\n${clip(slice.rows.join("\n") || "(empty)", SMALL_FILE_LIMIT, "code-map.md")}`;
}

function stableReferencesBlock(read: (name: string) => string | undefined): string {
  const present = STABLE_REFERENCES.flatMap((name) => {
    const text = read(name);
    return text === undefined ? [] : [`- ${name} (${kilobytes(text)})`];
  });
  return `### Read now (not inlined)\n${present.length > 0 ? present.join("\n") : "(none)"}`;
}

function projectLessonsBlock(lessons: readonly Lesson[], phaseEntry: string): string {
  const paths = outlineMarkdown(phaseEntry).codeSpans.map((span) => span.code).filter((code) => PATH_LIKE.test(code));
  const matching = lessonsForFiles(lessons, paths);
  const body = matching.length > 0 ? matching.map(describeLesson).join("\n") : "(none match the files this phase names)";
  return `### Project lessons for this phase's files (docs/specs/_ledger)\n${body}`;
}
