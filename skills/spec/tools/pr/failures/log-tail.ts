import { stripVTControlCharacters } from "node:util";

const BOM = /^﻿/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z ?/;
const ERROR_MARKER = "##[error]";

export const TAIL_LINES = 30;

// A job log ends with post-job cleanup; the failing step's output ends at the first ##[error] line.
export function failureTail(log: string, size = TAIL_LINES): string[] {
  const lines = log
    .replace(BOM, "")
    .split("\n")
    .map((line) => stripVTControlCharacters(line).replace(TIMESTAMP, "").trimEnd());
  while (lines.at(-1) === "") lines.pop();
  const marker = lines.findIndex((line) => line.startsWith(ERROR_MARKER));
  const end = marker === -1 ? lines.length : marker + 1;
  return lines.slice(Math.max(0, end - size), end);
}
