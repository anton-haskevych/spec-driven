import { removeFrontmatterLine } from "../core/frontmatter-patch";
import { EDGE_KEYS } from "../core/phase-edges";
import { ON_BOARD } from "../phases/template";
import { progressStub } from "./banner";
import { isCheckboxLine, replaceTaskLines } from "./deliverables";

export interface SpecPlanFiles {
  progress: string;
  phases: readonly { pointer: string; text: string }[];
}

// `pointer` is relative to the spec folder, as progress.md points at phase files.
export interface TidiedFile {
  pointer: string;
  text: string;
}

export function planTidy(spec: string, day: string, files: SpecPlanFiles): TidiedFile[] {
  const planned = [{ pointer: "progress.md", before: files.progress, text: progressStub(files.progress, spec, day) }, ...files.phases.map(({ pointer, text }) => ({ pointer, before: text, text: tidyPhaseText(text) }))];
  return planned.filter(({ before, text }) => before !== text).map(({ pointer, text }) => ({ pointer, text }));
}

export function tidyPhaseText(text: string): string {
  const withoutEdges = EDGE_KEYS.reduce((current, key) => {
    const patched = removeFrontmatterLine(current, key);
    return patched.kind === "ok" ? patched.text : current;
  }, text);
  return withoutEdges.split("\n").some(isCheckboxLine) ? replaceTaskLines(withoutEdges, [ON_BOARD]) : withoutEdges;
}
