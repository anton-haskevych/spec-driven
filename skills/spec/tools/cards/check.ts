import { validateRecordDoc } from "../plan/kinds";
import { coverRefProblem } from "./cover";
import type { RecordView } from "../record/view";
import { CARDS_FOLDER, SOURCES_FOLDER, TAGS_FOLDER, cardDocPath } from "./paths";
import { readCards } from "./read";
import { readSourceDoc } from "./source-doc";

export interface CardProblem {
  path: string;
  problem: string;
}

const FOLDERS = [CARDS_FOLDER, SOURCES_FOLDER, TAGS_FOLDER];

type Phased = Parameters<typeof coverRefProblem>[1];

// What no single document can see: each source's card exists, each card has exactly one origin, and with
// the specs at hand, what an open card's cover names still exists.
export function cardProblems(view: RecordView, specs?: Phased): CardProblem[] {
  const paths = view.paths().filter((path) => FOLDERS.some((folder) => path.startsWith(folder)));
  const cards = new Set(readCards(view).map((card) => card.id));
  const origins = new Map<string, number>();
  const problems = paths.flatMap((path) => documentProblems(view, path, cards, origins));
  const originProblems = [...cards].flatMap((id) => {
    const count = origins.get(id) ?? 0;
    return count === 1 ? [] : [{ path: cardDocPath(id), problem: `has ${count} origin sources, needs exactly 1` }];
  });
  const coverProblems = specs ? readCards(view).filter((card) => card.status === "open" || card.status === "doing").flatMap((card) => card.coveredBy.flatMap((ref) => {
    const problem = coverRefProblem(ref, specs);
    return problem ? [{ path: cardDocPath(card.id), problem: `covered by ${ref}: ${problem}` }] : [];
  })) : [];
  return [...problems, ...originProblems, ...coverProblems].toSorted((a, b) => a.path.localeCompare(b.path));
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
