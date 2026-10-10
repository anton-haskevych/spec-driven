export interface ContextRequest {
  mode: string;
  name?: string;
  hint?: string;
}

export type IsSpecName = (name: string) => boolean;

export const SUB_COMMANDS = new Set(["prep", "create", "resume", "execute", "review", "update", "handoff", "status", "list", "idea", "babysit"]);

const TRAILING_PUNCTUATION = /[.,;:!?]+$/;
const PHASE_ID = /^\d+[a-z]*(\.\d+)?$/i;
const PHASE_WORD_WITH_ID = /^phase[-\s]*\d+[a-z]*(\.\d+)?$/i;
const PHASE_WORD = /^phase$/i;
const PHASE_PREFIX = /^phase[-\s]*/i;

export function parseContextRequest(argv: readonly string[], isSpecName: IsSpecName = () => false): ContextRequest {
  const tokens = tokenize(argv);
  const first = tokens[0]?.toLowerCase();
  const last = tokens.at(-1)?.toLowerCase();
  if (first && SUB_COMMANDS.has(first)) return withChunkReferenceAsHint(first, tokens.slice(1), isSpecName);
  if (last && SUB_COMMANDS.has(last)) return withChunkReferenceAsHint(last, tokens.slice(0, -1), isSpecName);
  return { mode: "route", name: tokens[0], hint: undefined };
}

export function normalizePhaseHint(hint: string): string {
  return hint.replace(PHASE_PREFIX, "").trim();
}

// The chunk-hint rule for one token: `6`, `5b`, `9.10`, `phase6`, `phase-6`.
export function isPhaseId(token: string): boolean {
  return PHASE_ID.test(normalizePhaseHint(token));
}

function tokenize(argv: readonly string[]): string[] {
  return argv
    .flatMap((arg) => arg.split(/\s+/))
    .map((token) => token.replace(TRAILING_PUNCTUATION, ""))
    .filter(Boolean);
}

function withChunkReferenceAsHint(mode: string, rest: readonly string[], isSpecName: IsSpecName): ContextRequest {
  const [name, ...hint] = rest;
  if (name === undefined) return { mode, name: undefined, hint: undefined };
  if (isChunkReference(name, hint[0]) && !isSpecName(name)) return { mode, name: undefined, hint: rest.join(" ") };
  return { mode, name, hint: hint.join(" ") || undefined };
}

function isChunkReference(token: string, nextToken: string | undefined): boolean {
  if (token.toLowerCase() === "next" || PHASE_ID.test(token) || PHASE_WORD_WITH_ID.test(token)) return true;
  return PHASE_WORD.test(token) && nextToken !== undefined;
}
