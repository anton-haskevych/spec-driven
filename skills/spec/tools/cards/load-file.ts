import { isPlainObject } from "../record/document";

// A prepared board for `card load`: record documents in their final shape, keyed by id. Mapping another
// board's fields into these shapes is the caller's one-off script; this file only checks the keys.
//   { "cards": { "c01": <card doc> }, "sources": { "c01/a": <source doc> }, "tags": { "<name>": <tag doc> } }
// A document may leave out the id its key gives (`id`, `card`, `name`).

type Doc = Record<string, unknown>;

export interface LoadDocs {
  cards: { id: string; doc: Doc }[];
  sources: { card: string; letter: string; doc: Doc }[];
  tags: Doc[];
}

const PADDED_ID = /^c0*([1-9]\d*)$/;
const SOURCE_KEY = /^([^/]+)\/([a-z]+)$/;
const KEYS = new Set(["cards", "sources", "tags"]);

// `c01` and `c1` are the same card; the record writes `c1`.
export function canonicalCardId(value: unknown): string | undefined {
  const match = typeof value === "string" ? PADDED_ID.exec(value) : null;
  return match ? `c${match[1]}` : undefined;
}

export function readLoadFile(value: unknown): { docs: LoadDocs } | { problems: string[] } {
  if (!isPlainObject(value)) return { problems: ["the file must be a JSON object of cards, sources and tags"] };
  const problems = Object.keys(value).filter((key) => !KEYS.has(key)).map((key) => `unknown key: ${key} (the file holds cards, sources and tags)`);
  const [cards = [], sources = [], tags = []] = ["cards", "sources", "tags"].map((key) => section(value[key], key, problems));
  const docs = { cards: readCards(cards, problems), sources: readSources(sources, problems), tags: readTags(tags, problems) };
  return problems.length > 0 ? { problems } : { docs };
}

function section(value: unknown, key: string, problems: string[]): [string, Doc][] {
  if (value === undefined) return [];
  if (!isPlainObject(value)) {
    problems.push(`${key} must be an object keyed by id`);
    return [];
  }
  return Object.entries(value).flatMap(([id, doc]) => {
    if (isPlainObject(doc)) return [[id, doc] as [string, Doc]];
    problems.push(`${key}: "${id}" must hold a document`);
    return [];
  });
}

function readCards(entries: [string, Doc][], problems: string[]): LoadDocs["cards"] {
  const seen = new Map<string, string>();
  return entries.flatMap(([key, doc]) => {
    const id = canonicalCardId(key);
    if (!id) return note(problems, `cards: "${key}" is not a card id (c<n>)`);
    if (doc.id !== undefined && canonicalCardId(doc.id) !== id) return note(problems, `cards: "${key}" holds a card whose id is ${String(doc.id)}`);
    const first = seen.get(id);
    if (first) return note(problems, `cards: "${first}" and "${key}" are the same card`);
    seen.set(id, key);
    return [{ id, doc: { ...doc, id } }];
  });
}

function readSources(entries: [string, Doc][], problems: string[]): LoadDocs["sources"] {
  return entries.flatMap(([key, doc]) => {
    const match = SOURCE_KEY.exec(key);
    const card = canonicalCardId(match?.[1]);
    if (!match?.[2] || !card) return note(problems, `sources: "${key}" is not <card>/<letter>`);
    if (doc.card !== undefined && canonicalCardId(doc.card) !== card) return note(problems, `sources: "${key}" holds a source of card ${String(doc.card)}`);
    return [{ card, letter: match[2], doc: { ...doc, card } }];
  });
}

function readTags(entries: [string, Doc][], problems: string[]): LoadDocs["tags"] {
  return entries.flatMap(([key, doc]) => {
    if (doc.name !== undefined && doc.name !== key) return note(problems, `tags: "${key}" holds a tag named ${String(doc.name)}`);
    return [{ ...doc, name: key }];
  });
}

function note(problems: string[], problem: string): [] {
  problems.push(problem);
  return [];
}
