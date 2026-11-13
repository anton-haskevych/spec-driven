import { isTopLevelItem } from "../core/checkbox";
import { removeFrontmatterLine, setFrontmatterLine } from "../core/frontmatter-patch";
import { deployedMarker, PHASE_POINTER } from "../core/progress";
import type { PhaseDoc, Task } from "./docs/phase-doc";
import { withoutBoardLines } from "./banner";
import { linesOutsideFences, replaceTaskLines } from "./deliverables";
import { phaseDocDone, type JoinedPlan } from "./state-source";
import type { SpecPlanFiles, TidiedFile } from "./tidy";

const PHASES_HEADING = /^##\s+phases\b/i;

export interface ExportPlan {
  files: TidiedFile[];
  missing: string[];
}

export function planExport(plan: JoinedPlan, files: SpecPlanFiles, unjoin: boolean): ExportPlan {
  const texts = new Map(files.phases.map(({ pointer, text }) => [pointer, text]));
  const progress = progressText(unjoin ? withoutBoardLines(files.progress) : files.progress, plan.phases);
  const phases = plan.phases.flatMap((doc) => {
    const text = texts.get(doc.file);
    return text === undefined ? [] : [{ pointer: doc.file, before: text, text: phaseText(text, doc) }];
  });
  const changed = [{ pointer: "progress.md", before: files.progress, text: progress }, ...phases].filter(({ before, text }) => before !== text);
  return { files: changed.map(({ pointer, text }) => ({ pointer, text })), missing: plan.phases.filter((doc) => !texts.has(doc.file)).map((doc) => doc.file) };
}

// No id: a file names a task by its text, and a later join matches it by that text.
export function fileTaskLine(task: Task): string {
  return `- [${task.done ? "x" : " "}] ${task.text}${task.evidence ? ` — ${task.evidence}` : ""}`;
}

function progressLine(doc: PhaseDoc): string {
  const done = phaseDocDone(doc);
  return `- [${done ? "x" : " "}] Phase ${doc.id} — ${doc.title} → \`${doc.file}\`${done && doc.deployed ? deployedMarker(doc.deployed) : ""}`;
}

function progressText(progress: string, phases: readonly PhaseDoc[]): string {
  const lines = progress.split("\n");
  const phaseLines = new Set(linesOutsideFences(lines).filter((index) => isTopLevelItem(lines[index] ?? "") && PHASE_POINTER.test(lines[index] ?? "")));
  const kept = lines.filter((_, index) => !phaseLines.has(index));
  const heading = kept.findIndex((line) => PHASES_HEADING.test(line));
  const list = phases.map(progressLine);
  if (heading === -1) return `${kept.join("\n").replace(/\n+$/, "")}\n\n## Phases\n\n${list.join("\n")}\n`;
  const after = kept.slice(heading + 1);
  const rest = after.findIndex((line) => line.trim() !== "");
  const tail = rest === -1 ? [""] : ["", ...after.slice(rest)];
  return [...kept.slice(0, heading + 1), "", ...list, ...tail].join("\n");
}

function phaseText(text: string, doc: PhaseDoc): string {
  const edges: [string, string | undefined][] = [
    ["needs", idList(doc.needs)],
    ["needs-deployed", doc.needsDeployed?.length ? idList(doc.needsDeployed) : undefined],
    ["same-files-as", doc.sameFilesAs?.length ? idList(doc.sameFilesAs) : undefined],
    ["pr", doc.pr],
  ];
  const withFrontmatter = text.startsWith("---\n") ? text : `---\n---\n${text}`;
  const withEdges = edges.reduce((current, [key, value]) => {
    const patched = value === undefined ? removeFrontmatterLine(current, key) : setFrontmatterLine(current, key, value);
    return patched.kind === "ok" ? patched.text : current;
  }, withFrontmatter);
  return replaceTaskLines(withEdges, doc.tasks.map(fileTaskLine));
}

function idList(ids: readonly string[]): string {
  return `[${ids.join(", ")}]`;
}
