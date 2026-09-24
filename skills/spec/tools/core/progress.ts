import { outlineMarkdown } from "./markdown";

export interface PhaseLine {
  done: boolean;
  deployed: boolean;
  title: string;
  pointer: string;
}

const DEPLOYED_SUFFIX = /^\s*[·•(,;:–—-]*\s*deployed\b/i;

export interface CheckboxCount {
  checked: number;
  unchecked: number;
}

const PHASE_POINTER = /phases\/\S+?\.md/;
const TOP_LEVEL = 0;

export function parsePhaseLines(progress: string): PhaseLine[] {
  return outlineMarkdown(progress).tasks.flatMap((task) => {
    const match = PHASE_POINTER.exec(task.text);
    if (task.depth !== TOP_LEVEL || !match) return [];
    const end = match.index + match[0].length;
    const deployed = task.checked && DEPLOYED_SUFFIX.test(task.text.slice(end));
    return [{ done: task.checked, deployed, title: task.text.slice(0, end), pointer: match[0] }];
  });
}

export function countCheckboxes(markdown: string): CheckboxCount {
  const { tasks } = outlineMarkdown(markdown);
  const checked = tasks.filter((task) => task.checked).length;
  return { checked, unchecked: tasks.length - checked };
}
