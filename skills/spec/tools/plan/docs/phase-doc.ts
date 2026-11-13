import type { FrontmatterData } from "../../core/frontmatter";
import { GATE_KINDS, type GateKind } from "../../core/gate";
import { flag, oneOf, optionalText, requiredText, stringArray, withoutUndefined } from "../../core/read-fields";
import { isCalendarDay, readSchedule } from "../../core/schedule";
import type { ParkEntry } from "../../core/park";
import { readParks } from "./parks";
import { readObject, type DocRead } from "./read";

export interface Task {
  id: string;
  text: string;
  done: boolean;
  evidence?: string;
  gate?: boolean;
  // A tick made offline that waits for its push.
  unpushed?: boolean;
  // Who closed it and when: the session id and the tree's folder name. Join leaves them out.
  doneAt?: string;
  doneBy?: string;
  doneIn?: string;
}

// One phase on the record. Edges are always written out: `needs` is never implied.
export interface PhaseDoc {
  id: string;
  title: string;
  outcome: string;
  file: string;
  needs: string[];
  needsDeployed?: string[];
  sameFilesAs?: string[];
  pr?: string;
  due?: string;
  code: boolean;
  playbook?: string;
  gate?: GateKind;
  shape?: string;
  deployed?: string;
  tasks: Task[];
  // Questions a session parked the phase on; phase 7 moves them to question documents.
  parks?: ParkEntry[];
}

export function readPhaseDoc(value: unknown): DocRead<PhaseDoc> {
  return readObject(value, "phase", readPhaseFields);
}

function readPhaseFields(fields: FrontmatterData, problems: string[]): PhaseDoc {
  return withoutUndefined({
    id: requiredText(fields.id, "id", problems) ?? "",
    title: requiredText(fields.title, "title", problems) ?? "",
    outcome: typeof fields.outcome === "string" ? fields.outcome : (problems.push("outcome must be a string"), ""),
    file: requiredText(fields.file, "file", problems) ?? "",
    needs: requiredList(fields.needs, "needs", problems),
    needsDeployed: optionalList(fields.needsDeployed, "needsDeployed", problems),
    sameFilesAs: optionalList(fields.sameFilesAs, "sameFilesAs", problems),
    pr: optionalText(fields.pr, "pr", problems),
    code: flag(fields.code, "code", problems) ?? true,
    due: dueDay(fields, problems),
    playbook: optionalText(fields.playbook, "playbook", problems),
    gate: oneOf(fields.gate, GATE_KINDS, "gate", problems),
    shape: optionalText(fields.shape, "shape", problems),
    deployed: deployedDay(fields.deployed, problems),
    tasks: readTasks(fields.tasks, problems),
    parks: readParks(fields.parks, problems),
  });
}

function requiredList(value: unknown, key: string, problems: string[]): string[] {
  if (value === undefined) problems.push(`${key} must be a list of strings, e.g. ${key}: ["Vercel*"]`);
  return stringArray(value, key, problems);
}

function optionalList(value: unknown, key: string, problems: string[]): string[] | undefined {
  return value === undefined ? undefined : stringArray(value, key, problems);
}

function dueDay(fields: FrontmatterData, problems: string[]): string | undefined {
  const schedule = readSchedule({ due: fields.due });
  problems.push(...schedule.problems);
  return schedule.due;
}

function deployedDay(value: unknown, problems: string[]): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && isCalendarDay(value)) return value;
  problems.push(`deployed "${String(value)}" is not a date; use YYYY-MM-DD`);
  return undefined;
}

function readTasks(value: unknown, problems: string[]): Task[] {
  if (!Array.isArray(value)) {
    problems.push("tasks must be a list");
    return [];
  }
  const tasks = value.map((item, index) => readTask(item, index, problems));
  const ids = tasks.map((task) => task.id);
  problems.push(...[...new Set(ids.filter((id, index) => id !== "" && ids.indexOf(id) !== index))].map((id) => `task id ${id} appears twice`));
  return tasks;
}

function readTask(value: unknown, index: number, problems: string[]): Task {
  const fields: FrontmatterData = typeof value === "object" && value !== null && !Array.isArray(value) ? (value as FrontmatterData) : {};
  const own: string[] = [];
  const id = requiredText(fields.id, "id", own);
  const task = withoutUndefined({
    id: id ?? "",
    text: requiredText(fields.text, "text", own) ?? "",
    done: flag(fields.done, "done", own) ?? false,
    evidence: optionalText(fields.evidence, "evidence", own),
    gate: fields.gate === undefined ? undefined : flag(fields.gate, "gate", own),
    unpushed: fields.unpushed === undefined ? undefined : flag(fields.unpushed, "unpushed", own),
    doneAt: optionalText(fields.doneAt, "doneAt", own),
    doneBy: optionalText(fields.doneBy, "doneBy", own),
    doneIn: optionalText(fields.doneIn, "doneIn", own),
  });
  problems.push(...own.map((problem) => `task ${id ?? `#${index + 1}`}: ${problem}`));
  return task;
}
