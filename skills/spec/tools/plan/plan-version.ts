import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Env } from "../core/env";
import { isRecord } from "../core/frontmatter";
import { ownSessionId } from "../sessions/own";
import { planChangedLine, type PlanShape } from "./plan-diff";

// In tmpdir: it goes at reboot, and nothing lands in the git common dir.
export interface PlanMemory {
  specs(): string[];
  shown(spec: string): PlanShape | undefined;
  show(spec: string, shape: PlanShape): void;
  lastFetch(): FetchTry | undefined;
  triedFetch(at: Date, ok: boolean): void;
}

export interface FetchTry {
  at: Date;
  ok: boolean;
}

interface Stored {
  specs: Record<string, PlanShape>;
  fetch?: { at: string; ok: boolean };
}

export function planMemoryFor(env: Env, dir = tmpdir()): PlanMemory | undefined {
  const session = ownSessionId(env);
  return session ? sessionPlanMemory(session, dir) : undefined;
}

// Each change re-reads the file, so the hook's process and a command's don't drop each other's lines.
export function sessionPlanMemory(sessionId: string, dir = tmpdir()): PlanMemory {
  const file = join(dir, `spec-driven-plan-${sessionId.replace(/[^\w-]/g, "")}.json`);
  const change = (edit: (stored: Stored) => Stored) => writeAtomically(file, JSON.stringify(edit(readStored(file))));
  return {
    specs: () => Object.keys(readStored(file).specs),
    shown: (spec) => readStored(file).specs[spec],
    show: (spec, shape) => change((stored) => ({ ...stored, specs: { ...stored.specs, [spec]: shape } })),
    lastFetch() {
      const last = readStored(file).fetch;
      return last ? { at: new Date(last.at), ok: last.ok } : undefined;
    },
    triedFetch: (at, ok) => change((stored) => ({ ...stored, fetch: { at: at.toISOString(), ok } })),
  };
}

export function noticePlanChange(memory: PlanMemory, spec: string, shape: PlanShape): string | undefined {
  const before = memory.shown(spec);
  if (before?.version === shape.version) return undefined;
  memory.show(spec, shape);
  return before ? planChangedLine(before, shape) : undefined;
}

function readStored(file: string): Stored {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (!isRecord(parsed) || !isRecord(parsed.specs)) return { specs: {} };
    const fetch = isRecord(parsed.fetch) && typeof parsed.fetch.at === "string" ? { at: parsed.fetch.at, ok: parsed.fetch.ok === true } : undefined;
    return { specs: readShapes(parsed.specs), ...(fetch ? { fetch } : {}) };
  } catch {
    return { specs: {} };
  }
}

function readShapes(specs: Record<string, unknown>): Record<string, PlanShape> {
  return Object.fromEntries(Object.entries(specs).filter((entry): entry is [string, PlanShape] => isShape(entry[1])));
}

function isShape(value: unknown): value is PlanShape {
  if (!isRecord(value) || typeof value.version !== "number" || !Array.isArray(value.phases)) return false;
  return value.phases.every((phase) => isRecord(phase) && typeof phase.id === "string" && Array.isArray(phase.needs) && Array.isArray(phase.tasks));
}

function writeAtomically(file: string, text: string): void {
  const scratch = `${file}.${process.pid}`;
  writeFileSync(scratch, text);
  renameSync(scratch, file);
}
