import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../core/frontmatter";
import { allTasksDone, countTasks, summarizePhaseEntry, type PhaseEntrySummary } from "../core/phase-entry";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader, loadSpecStateFromFiles, type PhaseState, type ReadSpecFile, type SpecState } from "../core/spec-state";
import type { PhaseMark } from "../graph/nodes";
import type { RecordView } from "../record/view";
import { readPhaseDoc, type PhaseDoc, type Task } from "./docs/phase-doc";
import { readSpecDoc, type SpecDoc } from "./docs/spec-doc";
import { deliverablesSection, isCheckboxLine, linesOutsideFences } from "./deliverables";
import { phaseDocPath, specDocPath } from "./kinds";
import { joinedNotes } from "./phase-notes";
import type { QuestionDoc } from "../questions/question-doc";
import { readSpecQuestions } from "../questions/read";

export type SpecSource = (spec: SpecFolder) => SpecState;

export interface JoinedPlan {
  spec: SpecDoc;
  phases: PhaseDoc[];
  // Absent: none asked.
  questions?: QuestionDoc[];
}

const RUN_LIMIT = 5;

export function stateSourceFor(view: RecordView | undefined): SpecSource {
  return (spec) => {
    const plan = view ? readJoinedPlan(view, spec.name) : undefined;
    if (!plan) return loadSpecStateFromFiles(spec);
    return { ...joinedSpecState(spec, diskReader(spec.dir), plan), reviewed: existsSync(join(spec.dir, "reviews")) };
  };
}

// A phase document that doesn't read is left out rather than guessed at from the frozen file.
export function readJoinedPlan(view: RecordView, name: string): JoinedPlan | undefined {
  const spec = readSpecDoc(view.doc(specDocPath(name))).doc;
  if (!spec) return undefined;
  const phases = spec.phases.flatMap((id) => {
    const doc = readPhaseDoc(view.doc(phaseDocPath(name, id))).doc;
    return doc ? [doc] : [];
  });
  const questions = readSpecQuestions(view, name);
  return questions.length > 0 ? { spec, phases, questions } : { spec, phases };
}

export function joinedSpecState(spec: SpecFolder, read: ReadSpecFile, plan: JoinedPlan): SpecState {
  const phases = plan.phases.map((doc) => joinedPhase(read, doc));
  return { spec, hasProgress: true, phases, inFlight: joinedNotes(read, phases, plan) };
}

export function joinedPhaseMarks(plan: JoinedPlan): PhaseMark[] {
  return plan.phases.map((doc) => ({ id: doc.id, done: phaseDocDone(doc), deployed: doc.deployed !== undefined }));
}

export function phaseDocDone(doc: PhaseDoc): boolean {
  return doc.deployed !== undefined || allTasksDone(countTasks(doc.tasks));
}

function joinedPhase(read: ReadSpecFile, doc: PhaseDoc): PhaseState {
  const count = countTasks(doc.tasks);
  const prose = read(doc.file);
  const entry = prose === undefined ? undefined : withLiveTasks(bodyOf(prose), doc.tasks);
  const fromProse: Partial<PhaseEntrySummary> = entry === undefined ? {} : summarizePhaseEntry(entry);
  return {
    id: doc.id,
    name: doc.title,
    done: phaseDocDone(doc),
    deployed: doc.deployed !== undefined,
    ...(doc.deployed ? { deployedOn: doc.deployed } : {}),
    pointer: doc.file,
    edges: { declared: true, needs: doc.needs, needsDeployed: doc.needsDeployed ?? [], sameFilesAs: doc.sameFilesAs ?? [], ...(doc.pr ? { pr: doc.pr } : {}) },
    entry,
    summary: { ...fromProse, deliverables: count, nextRun: firstOpenRun(doc.tasks) },
    schedule: { ...(doc.due ? { due: doc.due } : {}), problems: [] },
    code: doc.code,
    playbook: doc.playbook,
    ...(doc.gate ? { gate: doc.gate } : {}),
  };
}

export function withLiveTasks(body: string, tasks: readonly Task[]): string {
  const lines = body.split("\n");
  const section = deliverablesSection(lines);
  const live = ["## Deliverables", "", ...tasks.map(taskLine)];
  if (section) {
    const rest = lines.slice(section.end);
    return [...lines.slice(0, section.start), ...live, ...(rest.length > 0 ? ["", ...rest] : [""])].join("\n");
  }
  const outside = new Set(linesOutsideFences(lines));
  const kept = lines.filter((line, index) => !outside.has(index) || !isCheckboxLine(line)).join("\n").replace(/\n+$/, "");
  return `${kept}\n\n${live.join("\n")}\n`;
}

export function taskLine(task: Task): string {
  return `- [${task.done ? "x" : " "}] ${task.id} ${task.text}${task.evidence ? ` — ${task.evidence}` : ""}`;
}

function firstOpenRun(tasks: readonly Task[]): string[] {
  const start = tasks.findIndex((task) => !task.done);
  if (start === -1) return [];
  const end = tasks.findIndex((task, index) => index > start && task.done);
  return tasks.slice(start, end === -1 ? undefined : end).slice(0, RUN_LIMIT).map((task) => `${task.id} ${task.text}`);
}

function bodyOf(prose: string): string {
  const parsed = parseFrontmatter(prose);
  return parsed.kind === "invalid" ? prose : parsed.body;
}
