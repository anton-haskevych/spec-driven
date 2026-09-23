export interface PhaseTitle {
  id: string;
  name: string;
}

const PHASE_PREFIX = /^Phase\s+(\S+?)\s*[—–:]\s*/i;
const POINTER_TAIL = /\s*(→|->)?\s*phases\/\S+$/;
const NUMERIC_PREFIX = /^\d+(\.\d+)?/;

export function parsePhaseTitle(title: string, fallbackId: string): PhaseTitle {
  const withoutPointer = title.replace(POINTER_TAIL, "").trim();
  const match = PHASE_PREFIX.exec(withoutPointer);
  if (!match?.[1]) return { id: fallbackId, name: withoutPointer };
  return { id: match[1], name: withoutPointer.slice(match[0].length).trim() };
}

export function numericPart(phaseId: string): number | undefined {
  const match = NUMERIC_PREFIX.exec(phaseId);
  return match ? Number(match[0]) : undefined;
}

export function samePhase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
