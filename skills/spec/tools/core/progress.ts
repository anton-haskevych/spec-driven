import { outlineMarkdown } from "./markdown";

export interface PhaseLine {
  done: boolean;
  deployed: boolean;
  deployedOn?: string;
  title: string;
  pointer: string;
}

const DEPLOYED_SUFFIX = /^\s*[·•(,;:–—-]*\s*deployed\b(?:\s+(\d{4}-\d{2}-\d{2}))?/i;

export function deployedMarker(day: string): string {
  return ` · deployed ${day}`;
}

export interface CheckboxCount {
  checked: number;
  unchecked: number;
}

export const PHASE_POINTER = /phases\/\S+?\.md/;
const TOP_LEVEL = 0;

export function parsePhaseLines(progress: string): PhaseLine[] {
  return outlineMarkdown(progress).tasks.flatMap((task) => {
    const match = PHASE_POINTER.exec(task.text);
    if (task.depth !== TOP_LEVEL || !match) return [];
    const end = match.index + match[0].length;
    const marker = task.checked ? DEPLOYED_SUFFIX.exec(task.text.slice(end)) : null;
    const deployedOn = marker?.[1];
    return [{ done: task.checked, deployed: marker !== null, ...(deployedOn ? { deployedOn } : {}), title: task.text.slice(0, end), pointer: match[0] }];
  });
}

const PHASE_TITLE = /^Phase\s/i;

export function indentedPhaseLines(progress: string): string[] {
  return outlineMarkdown(progress)
    .tasks.filter((task) => task.depth > TOP_LEVEL && PHASE_TITLE.test(task.text) && PHASE_POINTER.test(task.text))
    .map((task) => task.text);
}
