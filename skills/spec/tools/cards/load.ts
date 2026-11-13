import { serializeDoc } from "../record/document";
import type { RecordOp } from "../record/plan-writes";
import { viewWith, type RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import { cardProblems } from "./check";
import type { LoadDocs } from "./load-file";
import { cardDocPath, cardNumber, sourceDocPath, sourcesFolder, tagDocPath } from "./paths";
import { cardPaths } from "./read";
import type { See } from "./plans";

export type { LoadDocs } from "./load-file";

// About 100 cards and 450 sources land in one commit, so no number is ever half-imported.
export const LOAD_MAX_OPS = 2000;
const SHOWN_PROBLEMS = 10;

interface Move {
  from: string;
  to: string;
  sources: number;
}

// Planned at each tip: which ids are taken, and the free numbers above them, are read there.
export function loadPlan(docs: LoadDocs, options: { moveTaken: boolean }, see: See = () => {}): RecordPlan {
  return (view) => {
    const taken = takenIds(view, docs);
    if (taken.length > 0 && !options.moveTaken) return { refused: `${listed(taken)} ${taken.length === 1 ? "is" : "are"} already on the board; --move-taken moves ${taken.length === 1 ? "it" : "them"} up to free numbers` };
    const end = new Map<string, unknown>();
    const moves = moveTaken(view, taken, firstFreeNumber(view, docs), end);
    const freed = new Set(end.keys());
    for (const { id, doc } of docs.cards) end.set(cardDocPath(id), doc);
    for (const { card, letter, doc } of docs.sources) end.set(sourceDocPath(card, letter), doc);
    for (const doc of docs.tags) end.set(tagDocPath(String(doc.name)), doc);
    const problems = [...quotesInTheWay(view, docs, freed), ...boardProblems(view, end)].toSorted();
    if (problems.length > 0) return { refused: shortList(problems) };
    for (const move of moves) see(`card load: ${move.from} → ${move.to} (${count(move.sources, "source")})`);
    see(`card load: ${count(docs.cards.length, "card")}, ${count(docs.sources.length, "source")} and ${count(docs.tags.length, "tag")} on the board`);
    return { ops: opsFor(view, end), message: `record: card load (${count(docs.cards.length, "card")})` };
  };
}

function takenIds(view: RecordView, docs: LoadDocs): string[] {
  const onBoard = new Set(cardPaths(view).map(idOf));
  return docs.cards.map(({ id }) => id).filter((id) => onBoard.has(id)).toSorted(byNumber);
}

function firstFreeNumber(view: RecordView, docs: LoadDocs): number {
  const numbers = [...cardPaths(view).map(idOf), ...docs.cards.map(({ id }) => id)].map((id) => cardNumber(id) ?? 0);
  return Math.max(0, ...numbers) + 1;
}

function moveTaken(view: RecordView, taken: readonly string[], first: number, end: Map<string, unknown>): Move[] {
  return taken.map((from, index) => {
    const to = `c${first + index}`;
    end.set(cardDocPath(from), undefined);
    end.set(cardDocPath(to), { ...(view.doc(cardDocPath(from)) as object), id: to });
    const sources = view.paths().filter((path) => path.startsWith(sourcesFolder(from)));
    for (const path of sources) {
      end.set(path, undefined);
      end.set(sourceDocPath(to, path.slice(sourcesFolder(from).length, -".json".length)), { ...(view.doc(path) as object), card: to });
    }
    return { from, to, sources: sources.length };
  });
}

function quotesInTheWay(view: RecordView, docs: LoadDocs, freed: ReadonlySet<string>): string[] {
  return docs.sources
    .map(({ card, letter }) => sourceDocPath(card, letter))
    .filter((path) => view.version(path) !== undefined && !freed.has(path))
    .map((path) => `${path} is already on the board (a quote is never replaced)`);
}

function boardProblems(view: RecordView, end: ReadonlyMap<string, unknown>): string[] {
  const after = viewWith(view, [...end].map(([path, doc]) => ({ path, text: doc === undefined ? undefined : serializeDoc(doc) })));
  return cardProblems(after).filter(({ path }) => end.has(path)).map(({ path, problem }) => `${path}: ${problem}`);
}

function opsFor(view: RecordView, end: ReadonlyMap<string, unknown>): RecordOp[] {
  return [...end].map(([path, doc]): RecordOp => {
    if (doc === undefined) return { op: "delete", path };
    return view.version(path) === undefined ? { op: "create", path, doc } : { op: "replace", path, doc };
  });
}

function shortList(problems: readonly string[]): string {
  const shown = problems.slice(0, SHOWN_PROBLEMS).join("; ");
  return problems.length > SHOWN_PROBLEMS ? `${shown}; … and ${problems.length - SHOWN_PROBLEMS} more` : shown;
}

function listed(ids: readonly string[]): string {
  return ids.length === 1 ? ids[0]! : `${ids.slice(0, -1).join(", ")} and ${ids.at(-1)}`;
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function idOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1, -".json".length);
}

function byNumber(a: string, b: string): number {
  return (cardNumber(a) ?? 0) - (cardNumber(b) ?? 0);
}
