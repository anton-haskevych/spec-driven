import { validateRecordDoc } from "../plan/kinds";
import type { RecordView } from "../record/view";
import { CARDS_FOLDER, SOURCES_FOLDER, TAGS_FOLDER, cardDocPath } from "./paths";
import { readCards } from "./read";
import { readSourceDoc } from "./source-doc";

export interface CardProblem {
  path: string;
  problem: string;
}

const FOLDERS = [CARDS_FOLDER, SOURCES_FOLDER, TAGS_FOLDER];

// What no single document can see: each source's card exists, and each card has exactly one origin.
export function cardProblems(view: RecordView): CardProblem[] {
  const paths = view.paths().filter((path) => FOLDERS.some((folder) => path.startsWith(folder)));
  const cards = new Set(readCards(view).map((card) => card.id));
  const origins = new Map<string, number>();
  const problems = paths.flatMap((path) => documentProblems(view, path, cards, origins));
  const originProblems = [...cards].flatMap((id) => {
    const count = origins.get(id) ?? 0;
    return count === 1 ? [] : [{ path: cardDocPath(id), problem: `has ${count} origin sources, needs exactly 1` }];
  });
  return [...problems, ...originProblems].toSorted((a, b) => a.path.localeCompare(b.path));
}

function documentProblems(view: RecordView, path: string, cards: ReadonlySet<string>, origins: Map<string, number>): CardProblem[] {
  const own = validateRecordDoc(path, view.doc(path));
  if (own.length > 0) return own.map((line) => ({ path, problem: line.slice(path.length + 2) }));
  if (!path.startsWith(SOURCES_FOLDER)) return [];
  const source = readSourceDoc(view.doc(path)).doc;
  if (!source) return [];
  if (!cards.has(source.card)) return [{ path, problem: `card ${source.card} does not exist` }];
  if (source.role === "origin") origins.set(source.card, (origins.get(source.card) ?? 0) + 1);
  return [];
}
