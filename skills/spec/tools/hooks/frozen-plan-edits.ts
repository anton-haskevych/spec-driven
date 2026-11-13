import { parseFrontmatter } from "../core/frontmatter";
import { parsePhaseEdges } from "../core/phase-edges";
import { parsePhaseLines } from "../core/progress";
import { entryTasks, taskKey } from "../plan/entry-tasks";

export type PlanPart = "checkboxes" | "edges" | "phase list";

const PHASE_FILE = /^phases\/.+\.md$/;

// What a joined spec's record holds, read from a file copy. Prose isn't a plan part: it stays a file.
export function changedPlanParts(pathInSpec: string, before: string, after: string): PlanPart[] {
  if (pathInSpec === "progress.md") return differs(phaseList(before), phaseList(after)) ? ["phase list"] : [];
  if (!PHASE_FILE.test(pathInSpec)) return [];
  const parts: PlanPart[] = [];
  if (differs(checkboxes(before), checkboxes(after))) parts.push("checkboxes");
  if (differs(edges(before), edges(after))) parts.push("edges");
  return parts;
}

export function joinedEditProblem(spec: string, parts: readonly PlanPart[]): string {
  const verb = parts.length === 1 && parts[0] === "phase list" ? "lives" : "live";
  return `${spec} is on the board: its ${parts.join(" and ")} ${verb} in the record, so this edit changes nothing there. Undo it. Ticks go through \`spec.ts phase tick <spec> <phase> <task-id>\`; phase changes go through \`phase add\` / \`split\` / \`move\` / \`set\` / \`task\`.`;
}

const MOVED_FIELDS = ["status", "owner", "focus", "ship"] as const;
const FIELD_COMMANDS: Record<(typeof MOVED_FIELDS)[number], (spec: string) => string> = {
  status: (spec) => `spec.ts spec-status ${spec} <status>`,
  owner: (spec) => `spec.ts owner ${spec} <name|me|none>`,
  focus: (spec) => `spec.ts focus add|move|drop ${spec}`,
  ship: (spec) => `spec.ts ship ${spec} <auto|hold-for-review>`,
};

// An upgraded spec's CLAUDE.md: the four fields its record holds.
export function changedSpecFields(before: string, after: string): string[] {
  const was = frontmatterOf(before);
  const now = frontmatterOf(after);
  return MOVED_FIELDS.filter((key) => JSON.stringify(was[key]) !== JSON.stringify(now[key]));
}

export function movedFieldsProblem(spec: string, fields: readonly string[]): string {
  const commands = MOVED_FIELDS.filter((key) => fields.includes(key)).map((key) => `\`${FIELD_COMMANDS[key](spec)}\``);
  return `${spec} is on the board: its ${fields.join(" and ")} ${fields.length === 1 ? "lives" : "live"} in the record, so this edit changes nothing there. Undo it, then run ${commands.join(" and ")}.`;
}

function frontmatterOf(text: string): Record<string, unknown> {
  const parsed = parseFrontmatter(text);
  return parsed.kind === "ok" ? parsed.data : {};
}

function phaseList(text: string): string[] {
  return parsePhaseLines(text).map((line) => `${line.done}|${line.deployed}|${line.pointer}`);
}

function checkboxes(text: string): string[] {
  return entryTasks(text).map((task) => `${task.done}|${taskKey(task.text)}`);
}

function edges(text: string): string[] {
  const parsed = parseFrontmatter(text);
  const { needs, needsDeployed, sameFilesAs, pr } = parsePhaseEdges(parsed.kind === "ok" ? parsed.data : undefined);
  return [needs.join(","), needsDeployed.join(","), sameFilesAs.join(","), pr ?? ""];
}

function differs(before: readonly string[], after: readonly string[]): boolean {
  return before.length !== after.length || before.some((value, index) => value !== after[index]);
}
