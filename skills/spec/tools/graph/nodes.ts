import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { parsePhaseTitle } from "../core/phase-title";
import { parsePhaseLines } from "../core/progress";
import { listSpecs, type SpecFolder } from "../core/spec-folders";
import type { SpecMeta } from "../core/spec-meta";
import type { Relation } from "./relations";
import { readSpecFields, type RecordFields } from "./spec-fields";

export interface PhaseMark {
  id: string;
  done: boolean;
  deployed: boolean;
}

export interface SpecNode {
  spec: SpecFolder;
  status?: string;
  phases: PhaseMark[];
  codeMapPaths: string[];
  relations: Relation[];
  meta: SpecMeta;
  // The first H1 of CLAUDE.md.
  title?: string;
}

const CODE_MAP_PATH = /^\s*\|\s*`([^`]+)`/;

// A joined spec's done and deployed marks come from the record; its progress.md is frozen.
export type MarksSource = (spec: string) => PhaseMark[] | undefined;

// An upgraded spec's four fields come from the record; one not yet upgraded still reads its CLAUDE.md.
export type FieldsSource = (spec: string) => RecordFields | undefined;

export interface JoinedReads {
  marks: MarksSource;
  fields?: FieldsSource;
}

const FILES_ONLY: JoinedReads = { marks: () => undefined };

export function loadNodes(projectDir: string, joined: JoinedReads = FILES_ONLY): Map<string, SpecNode> {
  const nodes = new Map<string, SpecNode>();
  for (const spec of listSpecs(projectDir)) {
    if (!nodes.has(spec.name)) nodes.set(spec.name, loadNode(spec, joined));
  }
  return nodes;
}

function loadNode(spec: SpecFolder, { marks, fields }: JoinedReads): SpecNode {
  const { status, meta, relations, title } = readSpecFields(spec.dir, fields?.(spec.name));
  return {
    spec,
    ...(status ? { status } : {}),
    phases: marks(spec.name) ?? progressMarks(spec),
    codeMapPaths: codeMapPaths(readTextIfExists(join(spec.dir, "code-map.md")) ?? ""),
    relations,
    meta,
    ...(title ? { title } : {}),
  };
}

function progressMarks(spec: SpecFolder): PhaseMark[] {
  return parsePhaseLines(readTextIfExists(join(spec.dir, "progress.md")) ?? "").map((line, index) => ({
    id: parsePhaseTitle(line.title, String(index + 1)).id,
    done: line.done,
    deployed: line.deployed,
  }));
}

function codeMapPaths(codeMap: string): string[] {
  return codeMap.split("\n").flatMap((line) => {
    const path = CODE_MAP_PATH.exec(line)?.[1];
    return path && path.includes("/") ? [path] : [];
  });
}

export function hasFinishedStatus(node: SpecNode): boolean {
  return node.status === "done" || node.status === "good-enough" || node.status === "abandoned";
}

export function isFinished(node: SpecNode): boolean {
  if (hasFinishedStatus(node)) return true;
  return node.phases.length > 0 && node.phases.every((phase) => phase.done);
}
