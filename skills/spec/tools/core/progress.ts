import { outlineMarkdown } from "./markdown";

export interface PhaseLine {
  done: boolean;
  title: string;
  pointer: string;
}

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
    const ownText = task.text.slice(0, match.index + match[0].length);
    return [{ done: task.checked, title: ownText, pointer: match[0] }];
  });
}

export function countCheckboxes(markdown: string): CheckboxCount {
  const { tasks } = outlineMarkdown(markdown);
  const checked = tasks.filter((task) => task.checked).length;
  return { checked, unchecked: tasks.length - checked };
}
