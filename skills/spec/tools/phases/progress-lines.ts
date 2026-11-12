import { locatePhaseLine } from "./locate";

const OPEN_BOX = "[ ]";
const TICKED_BOX = "[x]";

export function insertAfterPhases(progress: string, pointers: readonly string[], newLines: readonly string[]): string {
  const lines = progress.split("\n");
  const located = pointers.map((pointer) => locatePhaseLine(progress, pointer) ?? -1);
  const anchor = located.length > 0 && Math.max(...located) >= 0 ? Math.max(...located) : lastNonBlankLine(lines);
  lines.splice(anchor + 1, 0, ...newLines);
  return lines.join("\n");
}

function lastNonBlankLine(lines: readonly string[]): number {
  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index]?.trim()) return index;
  }
  return -1;
}

export function tickPhaseLine(progress: string, pointer: string): string {
  return replaceInPhaseLine(progress, pointer, (line) => line.replace(OPEN_BOX, TICKED_BOX));
}

export function untickPhaseLine(progress: string, pointer: string): string {
  return replaceInPhaseLine(progress, pointer, (line) => line.replace(TICKED_BOX, OPEN_BOX));
}

export function replaceInPhaseLine(progress: string, pointer: string, edit: (line: string) => string): string {
  const index = locatePhaseLine(progress, pointer);
  if (index === undefined) return progress;
  const lines = progress.split("\n");
  lines[index] = edit(lines[index] ?? "");
  return lines.join("\n");
}
