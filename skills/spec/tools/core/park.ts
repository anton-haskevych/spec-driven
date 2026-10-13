import { phaseInFlightFile, type InFlightNote } from "./in-flight";
import { childLines, sectionLines, withSection } from "./markdown-sections";

// A parked phase waits on a person: a `- Parked …` line under `## Needs you` in its committed
// in-flight file, answered by an indented `- Answered …` line. The one home for crew questions.
export const NEEDS_YOU = "Needs you";

export interface ParkEntry {
  parkedAt: string;
  question: string;
  recommend?: string;
  answer?: { at: string; text: string };
}

export type NewPark = Omit<ParkEntry, "answer">;

const PARKED = /^- Parked (\S+): (.+?)(?: · recommend: (.+))?$/;
const ANSWERED = /^\s+- Answered (\S+): (.+)$/;

export function parkEntries(text: string): ParkEntry[] {
  const lines = sectionLines(text, NEEDS_YOU);
  return lines.flatMap((line, index) => {
    const match = PARKED.exec(line);
    if (!match?.[1] || !match[2]) return [];
    const answered = childLines(lines, index).map((child) => ANSWERED.exec(child)).find(Boolean);
    return [
      {
        parkedAt: match[1],
        question: match[2],
        ...(match[3] ? { recommend: match[3] } : {}),
        ...(answered?.[1] && answered[2] ? { answer: { at: answered[1], text: answered[2] } } : {}),
      },
    ];
  });
}

export function openPark(text: string): ParkEntry | undefined {
  return parkEntries(text).find((entry) => entry.answer === undefined);
}

// The phase's last entry, open or answered: what execute and resume show.
export function lastPark(notes: readonly InFlightNote[], phaseId: string): ParkEntry | undefined {
  const note = notes.find((candidate) => candidate.file === phaseInFlightFile(phaseId));
  return note ? parkEntries(note.text).at(-1) : undefined;
}

export function parkOf(notes: readonly InFlightNote[], phaseId: string): ParkEntry | undefined {
  const note = notes.find((candidate) => candidate.file === phaseInFlightFile(phaseId));
  return note ? openPark(note.text) : undefined;
}

export function withPark(text: string | undefined, phaseId: string, entry: NewPark): string {
  const line = `- Parked ${entry.parkedAt}: ${entry.question}${entry.recommend ? ` · recommend: ${entry.recommend}` : ""}`;
  const base = text ?? `# In-flight — phase ${phaseId}\n`;
  return withSection(base, NEEDS_YOU, [...sectionLines(base, NEEDS_YOU), line]);
}

// Answers the open entry; undefined when there is none.
export function withAnswer(text: string, answer: string, at: string): string | undefined {
  const lines = sectionLines(text, NEEDS_YOU);
  const open = lines.findIndex((line, index) => PARKED.test(line) && !childLines(lines, index).some((child) => ANSWERED.test(child)));
  if (open === -1) return undefined;
  const after = open + 1 + childLines(lines, open).length;
  const answered = [...lines.slice(0, after), `  - Answered ${at}: ${answer}`, ...lines.slice(after)];
  return withSection(text, NEEDS_YOU, answered);
}
