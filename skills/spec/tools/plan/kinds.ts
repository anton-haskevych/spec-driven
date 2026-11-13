import type { DocRead } from "./docs/read";
import { readPhaseDoc } from "./docs/phase-doc";
import { readSpecDoc } from "./docs/spec-doc";

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
  return carried === fromPath ? undefined : `${field} ${carried} does not match the path`;
}

export function specDocPath(spec: string): string {
  return `specs/${spec}/spec.json`;
}

export function phaseDocPath(spec: string, phase: string): string {
  return `specs/${spec}/phases/${phase}.json`;
}
