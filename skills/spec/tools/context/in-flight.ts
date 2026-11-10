import { join } from "node:path";
import type { InFlightNote } from "../core/in-flight";

const INLINE_LIMIT = 2000;

export function inFlightBlock(notes: readonly InFlightNote[], specDir: string): string {
  const shown = notes.filter((note) => note.text.trim() !== "");
  if (shown.length === 0) return "### In-flight (raw)\n(none)";
  const text = shown.map((note) => `#### ${note.file}\n${note.text.trim()}`).join("\n\n");
  if (text.length <= INLINE_LIMIT) return `### In-flight (raw)\n${text}`;
  return [
    "### In-flight (read now)",
    "Read every file below in full before recommending next work or acting. These handoffs are not inlined:",
    ...shown.map((note) => `- ${join(specDir, note.file)}`),
  ].join("\n");
}
