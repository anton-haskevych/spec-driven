import type { Lesson } from "./project-ledger";

export interface ScoredLesson {
  lesson: Lesson;
  score: number;
}

const WORD = /[a-z0-9]+/g;
const KIND_PREFIX = /^(gotcha|decision|principle|domain|workaround|pattern|recipe)-/;
const STEM_LENGTH = 5;
const MIN_WORD = 3;
const STOP_WORDS = new Set(["the", "and", "for", "with", "not", "are", "its", "into", "from", "that", "this", "when", "must", "every", "only", "have"]);

export function similarLessons(lessons: readonly Lesson[], query: string, limit = 3): ScoredLesson[] {
  const wanted = stems(query);
  return lessons
    .map((lesson) => ({ lesson, score: overlap(wanted, stems(`${lesson.name} ${lesson.title}`)) }))
    .filter((scored) => scored.score > 0)
    .toSorted((a, b) => b.score - a.score)
    .slice(0, limit);
}

function stems(text: string): Set<string> {
  const words = text.toLowerCase().replace(KIND_PREFIX, "").replace(/\.md$/, "").match(WORD) ?? [];
  return new Set(words.filter((word) => word.length >= MIN_WORD && !STOP_WORDS.has(word)).map((word) => word.slice(0, STEM_LENGTH)));
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const shared = [...a].filter((stem) => b.has(stem)).length;
  return shared / Math.min(a.size, b.size);
}
