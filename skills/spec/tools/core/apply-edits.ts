import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { diskReader, type ReadSpecFile } from "./spec-state";

export interface FileEdit {
  file: string;
  text: string;
}

export interface FileRename {
  from: string;
  to: string;
}

export type EditPlan =
  | { kind: "ok"; edits: FileEdit[]; renames?: FileRename[] }
  | { kind: "unchanged"; reason: string }
  | { kind: "invalid"; reason: string };

export function applyEdits(plan: Extract<EditPlan, { kind: "ok" }>): void {
  for (const { from, to } of plan.renames ?? []) {
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
  }
  for (const { file, text } of plan.edits) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
}

export function readThroughEdits(dir: string, edits: readonly FileEdit[]): ReadSpecFile {
  const planned = new Map(edits.map((edit) => [edit.file, edit.text]));
  const disk = diskReader(dir);
  return (pathInSpec) => planned.get(join(dir, pathInSpec)) ?? disk(pathInSpec);
}
