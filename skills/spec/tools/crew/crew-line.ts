// The line a crew worker's handoff ends with (handoff.md §4 → Crew worker):
// `Crew: needs you <n> (in-flight.md) · say if wrong <n> · PR group ready <group | no> · next <…> · servers stopped <…>`
export interface CrewLine {
  raw: string;
  needsYou: number;
  sayIfWrong: number;
  prGroupReady?: string;
  next: string;
}

export function findCrewLine(text: string): CrewLine | undefined {
  const raw = text
    .split("\n")
    .map((line) => line.trim())
    .findLast((line) => line.startsWith("Crew:"));
  if (raw === undefined) return undefined;
  const group = field(raw, /PR group ready (\S+)/);
  return {
    raw,
    needsYou: Number(field(raw, /needs you (\d+)/) ?? 0),
    sayIfWrong: Number(field(raw, /say if wrong (\d+)/) ?? 0),
    ...(group && group !== "no" ? { prGroupReady: group } : {}),
    next: field(raw, /next ([^·]+)/)?.trim() ?? "nothing",
  };
}

function field(line: string, pattern: RegExp): string | undefined {
  return pattern.exec(line)?.[1];
}
