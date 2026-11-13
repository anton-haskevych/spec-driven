// Where card, source and tag documents live on the record; each path follows from the id alone.

const CARD_ID = /^c([1-9]\d*)$/;
const SHARD_SIZE = 100;

export const CARDS_FOLDER = "cards/";
export const SOURCES_FOLDER = "sources/";
export const TAGS_FOLDER = "tags/";

export function isCardId(value: unknown): value is string {
  return typeof value === "string" && CARD_ID.test(value);
}

export function cardNumber(id: string): number | undefined {
  const match = CARD_ID.exec(id);
  return match?.[1] ? Number(match[1]) : undefined;
}

// Folders of 100 by number: a card write pushes one small folder, not the whole list.
export function cardDocPath(id: string): string {
  return `${CARDS_FOLDER}${Math.floor((cardNumber(id) ?? 0) / SHARD_SIZE)}/${id}.json`;
}

export function sourcesFolder(card: string): string {
  return `${SOURCES_FOLDER}${card}/`;
}

export function sourceDocPath(card: string, letter: string): string {
  return `${sourcesFolder(card)}${letter}.json`;
}

export function tagSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function tagDocPath(name: string): string {
  return `${TAGS_FOLDER}${tagSlug(name)}.json`;
}

// a … z, then aa, ab …: the letter after the last one taken.
export function nextSourceLetter(taken: readonly string[]): string {
  const last = Math.max(0, ...taken.map(letterNumber));
  return numberLetter(last + 1);
}

function letterNumber(letter: string): number {
  return [...letter].reduce((sum, char) => sum * 26 + (char.charCodeAt(0) - 96), 0);
}

function numberLetter(n: number): string {
  return n <= 26 ? String.fromCharCode(96 + n) : numberLetter(Math.floor((n - 1) / 26)) + numberLetter(((n - 1) % 26) + 1);
}
