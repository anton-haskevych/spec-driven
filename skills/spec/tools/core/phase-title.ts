export interface PhaseTitle {
  id: string;
  name: string;
}

const PHASE_PREFIX = /^Phase\s+(\S+?)\s*[—–:]\s*/i;
const POINTER_TAIL = /\s*(→|->)?\s*phases\/\S+$/;
const PHASE_ID_PARTS = /^(\d+(?:\.\d+)*)([a-z]*)(.*)$/i;

interface PhaseIdParts {
  numbers: number[];
  letters: string;
  rest: string;
}

export function parsePhaseTitle(title: string, fallbackId: string): PhaseTitle {
  const withoutPointer = title.replace(POINTER_TAIL, "").trim();
  const match = PHASE_PREFIX.exec(withoutPointer);
  if (!match?.[1]) return { id: fallbackId, name: withoutPointer };
  return { id: match[1], name: withoutPointer.slice(match[0].length).trim() };
}

export function comparePhaseIds(a: string, b: string): number | undefined {
  const left = phaseIdParts(a);
  const right = phaseIdParts(b);
  if (!left || !right) return undefined;
  return (
    compareNumbers(left.numbers, right.numbers) ||
    left.letters.length - right.letters.length ||
    left.letters.localeCompare(right.letters) ||
    left.rest.localeCompare(right.rest)
  );
}

export function phaseInRange(phaseId: string, from: string, to: string): boolean {
  const id = phaseIdParts(phaseId);
  const upper = phaseIdParts(to);
  const fromOrder = comparePhaseIds(from, phaseId);
  if (!id || !upper || fromOrder === undefined) return false;
  return fromOrder <= 0 && compareNumbers(id.numbers, upper.numbers) <= 0;
}

function phaseIdParts(phaseId: string): PhaseIdParts | undefined {
  const match = PHASE_ID_PARTS.exec(phaseId.toLowerCase());
  if (!match?.[1]) return undefined;
  return { numbers: match[1].split(".").map(Number), letters: match[2] ?? "", rest: match[3] ?? "" };
}

function compareNumbers(a: readonly number[], b: readonly number[]): number {
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? -1) - (b[index] ?? -1);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function samePhase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
