import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { LOAD_MAX_OPS, loadPlan } from "../../cards/load";
import { readLoadFile } from "../../cards/load-file";
import type { PhaseDeps } from "../../plan/phase-writer";
import { parseFlags } from "../phase/args";
import { landNow } from "./land";
import { refusedLine } from "./send";

const LOAD_FLAGS = { file: { type: "string" }, "move-taken": { type: "boolean" } } as const;

// `card load --file <docs.json> [--move-taken]`: a whole board, already in record shape, keeps its numbers.
export async function loadCards(projectDir: string, args: readonly string[], deps: PhaseDeps, usage: string): Promise<string> {
  const parsed = parseFlags(args, LOAD_FLAGS);
  const file = parsed?.values.file;
  if (!parsed || parsed.positionals.length > 0 || !file) return `usage: ${usage}`;
  const path = resolve(projectDir, file);
  if (!existsSync(path)) return refusedLine("load", `No file ${path}.`);
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return refusedLine("load", `${basename(path)} is not JSON (${(error as Error).message}).`);
  }
  const read = readLoadFile(value);
  if ("problems" in read) return refusedLine("load", read.problems.join("; "));
  const moveTaken = parsed.values["move-taken"] === true;
  return landNow(projectDir, deps, "load", () => (see) => loadPlan(read.docs, { moveTaken }, see), LOAD_MAX_OPS);
}
