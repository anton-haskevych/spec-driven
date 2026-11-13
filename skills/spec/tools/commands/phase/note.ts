import { existsSync, readFileSync } from "node:fs";
import { isoTimestamp } from "../../core/schedule";
import { renderWritten } from "../../plan/phase-writer";
import { parseFlags } from "./args";
import type { PhaseContext } from "./context";

export const NOTE_USAGE = "phase note <spec> <phase> --file <note.md> | --clear";

// The hand-off note: in the phase's in-flight file, or on its record document for a joined spec.
export function phaseNote(context: PhaseContext, args: readonly string[]): string | Promise<string> {
  const parsed = parseFlags(args, { file: { type: "string" }, clear: { type: "boolean" } });
  const [specName, phase] = parsed?.positionals ?? [];
  const file = parsed?.values.file;
  const clear = parsed?.values.clear === true;
  if (!parsed || !specName || !phase || clear === (file !== undefined)) return `usage: ${NOTE_USAGE}`;
  if (file !== undefined && !existsSync(file)) return `phase note: no file ${file}`;
  const note = file === undefined ? undefined : readFileSync(file, "utf8");
  if (note !== undefined && note.trim() === "") return `phase note: ${file} is empty; use --clear to remove the note`;
  const writer = context.writerFor(specName);
  if (typeof writer === "string") return `phase note: ${writer}`;
  return renderWritten("note", writer.note({ phase, ...(note === undefined ? {} : { note }), at: isoTimestamp(context.deps.now()) }));
}
