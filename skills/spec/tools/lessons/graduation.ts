import type { Lesson } from "./project-ledger";

export const GRADUATION_THRESHOLD = 3;

export interface CandidateScope {
  specName?: string;
  paths?: readonly string[];
}

export function graduationCandidates(lessons: readonly Lesson[], scope: CandidateScope = {}): Lesson[] {
  return lessons
    .filter((lesson) => !lesson.enforcedBy && lesson.seenIn.length >= GRADUATION_THRESHOLD && inScope(lesson, scope))
    .toSorted((a, b) => b.seenIn.length - a.seenIn.length);
}

function inScope(lesson: Lesson, { specName, paths }: CandidateScope): boolean {
  if (!specName && !paths) return true;
  if (specName && lesson.seenIn.includes(specName)) return true;
  return (paths ?? []).some((path) => lesson.paths.some((glob) => new Bun.Glob(glob).match(path)));
}

export function describeCandidate(lesson: Lesson): string {
  return `- ${lesson.title} (\`${lesson.name}\`): seen in ${lesson.seenIn.length} specs (${lesson.seenIn.join(", ")}), no guard yet`;
}
