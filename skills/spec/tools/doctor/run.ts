import { existsSync } from "node:fs";
import { join } from "node:path";
import { markdownFilesIn, readTextIfExists } from "../core/files";
import { parsePhaseLines } from "../core/progress";
import type { SpecFolder } from "../core/spec-folders";
import { loadSpecState } from "../core/spec-state";
import { graphIssues } from "../graph/checks";
import type { SpecNode } from "../graph/nodes";
import type { Issue } from "./issue";
import { checkLedgerEntry, checkLedgerIndex } from "./ledger";
import { gateIssues } from "./gates";
import { phaseEdgeIssues } from "./phase-edges";
import { phaseScheduleIssues, specOverdueIssues } from "./schedule";
import { taskPhaseIssues } from "./task-phases";
import { phasePlaybookIssues } from "./playbooks";
import { checkInFlight, checkPhases } from "./phases";
import { checkSpecMeta } from "./spec-meta";

export interface DoctorContext {
  statuses: readonly string[];
  nodes: ReadonlyMap<string, SpecNode>;
  gates?: ReadonlyMap<string, string[]>;
  today: string;
  playbooks: ReadonlySet<string>;
}

const LEDGER_INDEX = "INDEX.md";

export function runDoctor(spec: SpecFolder, context: DoctorContext): Issue[] {
  const graph = graphIssues(context.nodes, spec.name, join(spec.dir, "CLAUDE.md"));
  const state = loadSpecState(spec);
  const edges = phaseEdgeIssues(state, context.nodes);
  const schedule = [
    ...specOverdueIssues(join(spec.dir, "CLAUDE.md"), context.nodes.get(spec.name), context.today),
    ...phaseScheduleIssues(state, context.today),
  ];
  const tasks = [...taskPhaseIssues(state), ...phasePlaybookIssues(state, context.playbooks)];
  const prOpeningFile = join(spec.dir, "pr-opening.md");
  const gates = gateIssues(prOpeningFile, readTextIfExists(prOpeningFile) ?? "", context.gates);
  return [...metaIssues(spec, context), ...graph, ...ledgerIssues(spec), ...progressIssues(spec), ...edges, ...schedule, ...tasks, ...gates];
}

function metaIssues(spec: SpecFolder, context: DoctorContext): Issue[] {
  const file = join(spec.dir, "CLAUDE.md");
  const text = readTextIfExists(file);
  return text === undefined ? [] : checkSpecMeta(file, text, context.statuses);
}

function ledgerIssues(spec: SpecFolder): Issue[] {
  const ledgerDir = join(spec.dir, "ledger");
  const entries = markdownFilesIn(ledgerDir).filter((name) => name !== LEDGER_INDEX);
  const entryExists = (name: string) => existsSync(join(ledgerDir, name));
  const entryIssues = entries.flatMap((name) => {
    const file = join(ledgerDir, name);
    return checkLedgerEntry(file, readTextIfExists(file) ?? "", entryExists);
  });

  const indexFile = join(ledgerDir, LEDGER_INDEX);
  const indexText = readTextIfExists(indexFile);
  const indexIssues = indexText === undefined ? [] : checkLedgerIndex(indexFile, indexText, entries);
  return [...entryIssues, ...indexIssues];
}

function progressIssues(spec: SpecFolder): Issue[] {
  const progressFile = join(spec.dir, "progress.md");
  const phases = parsePhaseLines(readTextIfExists(progressFile) ?? "");
  const phaseIssues = checkPhases(progressFile, phases, (pointer) => readTextIfExists(join(spec.dir, pointer)));

  const inFlightFile = join(spec.dir, "in-flight.md");
  const inFlight = readTextIfExists(inFlightFile);
  const everyPhaseDone = phases.length > 0 && phases.every((phase) => phase.done);
  const inFlightIssues = inFlight === undefined ? [] : checkInFlight(inFlightFile, inFlight, everyPhaseDone);
  return [...phaseIssues, ...inFlightIssues];
}
