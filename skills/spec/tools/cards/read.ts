import type { RecordView } from "../record/view";
import { readCardDoc, type CardDoc } from "./card-doc";
import { CARDS_FOLDER, cardNumber, sourcesFolder } from "./paths";
import { readSourceDoc, type SourceDoc } from "./source-doc";

export interface CardSource {
  letter: string;
  doc: SourceDoc;
}

export function cardPaths(view: RecordView): string[] {
  return view.paths().filter((path) => path.startsWith(CARDS_FOLDER));
}

// Every card on the record by number; one that doesn't read is left out (`card check` names it).
export function readCards(view: RecordView): CardDoc[] {
  const cards = cardPaths(view).flatMap((path) => readCardDoc(view.doc(path)).doc ?? []);
  return cards.toSorted((a, b) => (cardNumber(a.id) ?? 0) - (cardNumber(b.id) ?? 0));
}

export function readSourceEntries(view: RecordView, card: string): CardSource[] {
  const folder = sourcesFolder(card);
  const entries = view.paths().flatMap((path) => {
    if (!path.startsWith(folder)) return [];
    const doc = readSourceDoc(view.doc(path)).doc;
    return doc ? [{ letter: path.slice(folder.length, -".json".length), doc }] : [];
  });
  return entries.toSorted((a, b) => a.letter.length - b.letter.length || a.letter.localeCompare(b.letter));
}

export function readSources(view: RecordView, card: string): SourceDoc[] {
  return readSourceEntries(view, card).map((entry) => entry.doc);
}

export function originOf(view: RecordView, card: string): SourceDoc | undefined {
  return readSources(view, card).find((source) => source.role === "origin");
}
