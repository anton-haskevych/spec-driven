import { locatePhaseLine } from "./locate";

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
