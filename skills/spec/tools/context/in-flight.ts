import { join } from "node:path";
import type { InFlightNote } from "../core/in-flight";

// Never clip() a note: "Pick up from here" is its last section, the part the next session needs most.
const INLINE_LIMIT = 8000;

export function inFlightBlock(specDir: string, own: readonly InFlightNote[], others: readonly InFlightNote[] = []): string {
  const { whole, tooLarge } = fitWhole(own.filter(hasText));
  const elsewhere = others.filter(hasText);
  const paths = (notes: readonly InFlightNote[]) => notes.map((note) => `- ${join(specDir, note.file)}`);
  return [
    `### In-flight (raw)\n${whole.length > 0 ? whole.map((note) => `#### ${note.file}\n${note.text.trim()}`).join("\n\n") : "(none)"}`,
    ...(tooLarge.length > 0 ? [["Too large to show here. Read each in full before acting:", ...paths(tooLarge)].join("\n")] : []),
    ...(elsewhere.length > 0 ? [["Other phases' pending notes, not this chunk's. Read one only when the work touches that phase:", ...paths(elsewhere)].join("\n")] : []),
  ].join("\n\n");
}

function fitWhole(notes: readonly InFlightNote[]): { whole: InFlightNote[]; tooLarge: InFlightNote[] } {
  const whole: InFlightNote[] = [];
  const tooLarge: InFlightNote[] = [];
  let used = 0;
  for (const note of notes) {
    const size = note.text.trim().length;
    if (used + size > INLINE_LIMIT) {
      tooLarge.push(note);
      continue;
    }
    whole.push(note);
    used += size;
  }
  return { whole, tooLarge };
}

function hasText(note: InFlightNote): boolean {
  return note.text.trim() !== "";
}
