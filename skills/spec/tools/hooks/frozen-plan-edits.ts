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
  return `${spec} is on the board: its ${parts.join(" and ")} ${verb} in the record, so this edit changes nothing there. Undo it. Ticks go through \`spec.ts phase tick <spec> <phase> <task-id>\`; phase changes go through \`phase add\` / \`split\` / \`move\` / \`set\`.`;
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
