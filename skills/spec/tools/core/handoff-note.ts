import { sectionLines, withoutSection, withSection } from "./markdown-sections";
import { NEEDS_YOU } from "./park";

// A phase's hand-off note: what the next session picks up. Its questions are not part of it: `phase park`
// keeps those under `## Needs you`, in the file or on the record.
export function noteBody(text: string): string {
  return withoutSection(text, NEEDS_YOU).trim() === "" ? "" : withoutSection(text, NEEDS_YOU);
}

// What `in-flight/phase-<id>.md` holds after a hand-off: the new note, then the questions the old file held.
// Clearing the note keeps the file only while it holds questions; undefined means remove it.
export function noteFileText(note: string | undefined, previous: string | undefined, phaseId: string): string | undefined {
  const questions = previous === undefined ? [] : sectionLines(previous, NEEDS_YOU);
  const body = note === undefined ? "" : noteBody(note);
  if (questions.length === 0) return body === "" ? undefined : body;
  return withSection(body === "" ? `# In-flight — phase ${phaseId}\n` : body, NEEDS_YOU, questions);
}
