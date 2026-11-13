import { cardDocPath } from "../cards/paths";
import type { DocRead } from "./docs/read";
import { readPhaseDoc } from "./docs/phase-doc";
import { readPrDoc } from "./docs/pr-doc";
import { readSpecDoc } from "./docs/spec-doc";
import { readQuestionDoc } from "../questions/question-doc";
import { readCardDoc } from "../cards/card-doc";
import { tagSlug } from "../cards/paths";
import { readSourceDoc } from "../cards/source-doc";
import { readTagDoc } from "../cards/tag-doc";
import type { SessionRef } from "../runtime/sessions";
import { readSessionDoc, sessionSlug } from "../sessions/session-doc";

// Where each document kind lives on the record, and its reader. The store is handed `validateRecordDoc`
// and never imports a reader; later phases add rows here.
interface RecordKind {
  path: RegExp;
  read(value: unknown): DocRead<unknown>;
  // The name the path gives the document, against the one it carries.
  identity(doc: unknown, match: RegExpExecArray): string | undefined;
}

const KINDS: readonly RecordKind[] = [
  {
    path: /^specs\/([^/]+)\/spec\.json$/,
    read: readSpecDoc,
    identity: (doc, match) => mismatch("name", (doc as { name: string }).name, match[1]),
  },
  {
    path: /^specs\/([^/]+)\/phases\/([^/]+)\.json$/,
    read: readPhaseDoc,
    identity: (doc, match) => mismatch("id", (doc as { id: string }).id, match[2]),
  },
  {
    path: /^specs\/([^/]+)\/prs\/([^/]+)\.json$/,
    read: readPrDoc,
    identity: (doc, match) => mismatch("group", (doc as { group: string }).group, match[2]),
  },
  {
    path: /^specs\/([^/]+)\/questions\/([^/]+)\.json$/,
    read: readQuestionDoc,
    identity: (doc, match) => mismatch("id", (doc as { id: string }).id, match[2]),
  },
  {
    path: /^cards\/(\d+)\/(c\d+)\.json$/,
    read: readCardDoc,
    identity: (doc, match) => notAt("id", (doc as { id: string }).id, cardDocPath((doc as { id: string }).id) === match[0]),
  },
  {
    path: /^sources\/([^/]+)\/[a-z]+\.json$/,
    read: readSourceDoc,
    identity: (doc, match) => mismatch("card", (doc as { card: string }).card, match[1]),
  },
  {
    path: /^tags\/([^/]+)\.json$/,
    read: readTagDoc,
    identity: (doc, match) => notAt("name", (doc as { name: string }).name, tagSlug((doc as { name: string }).name) === match[1]),
  },
  {
    path: /^sessions\/([^/]+)\.json$/,
    read: readSessionDoc,
    identity: (doc, match) => {
      const { ref } = doc as { ref: SessionRef };
      return sessionSlug(ref) === match[1] ? undefined : `ref ${JSON.stringify(ref)} does not match the path`;
    },
  },
];

export function validateRecordDoc(path: string, value: unknown): string[] {
  for (const kind of KINDS) {
    const match = kind.path.exec(path);
    if (!match) continue;
    const read = kind.read(value);
    const problems = read.doc === undefined ? read.problems : [kind.identity(read.doc, match)].filter((problem) => problem !== undefined);
    return problems.map((problem) => `${path}: ${problem}`);
  }
  return [`${path}: no document kind is stored at this path`];
}

function mismatch(field: string, carried: string, fromPath: string | undefined): string | undefined {
  return notAt(field, carried, carried === fromPath);
}

function notAt(field: string, carried: string, matches: boolean): string | undefined {
  return matches ? undefined : `${field} ${carried} does not match the path`;
}

export function specDocPath(spec: string): string {
  return `specs/${spec}/spec.json`;
}

export function phaseDocPath(spec: string, phase: string): string {
  return `specs/${spec}/phases/${phase}.json`;
}

export function prDocsFolder(spec: string): string {
  return `specs/${spec}/prs/`;
}

export function prDocPath(spec: string, group: string): string {
  return `${prDocsFolder(spec)}${group}.json`;
}

export function questionsFolder(spec: string): string {
  return `specs/${spec}/questions/`;
}

export function questionDocPath(spec: string, id: string): string {
  return `${questionsFolder(spec)}${id}.json`;
}
