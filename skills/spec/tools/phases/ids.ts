import { samePhase } from "../core/phase-title";

const LEADING_INTEGER = /^(\d+)/;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export function nextIntegerId(ids: readonly string[]): string {
  const integers = ids.map((id) => Number(LEADING_INTEGER.exec(id)?.[1] ?? 0));
  return String(Math.max(0, ...integers) + 1);
}

export function nextLetterIds(base: string, ids: readonly string[], count: number): string[] {
  const taken = (candidate: string) => ids.some((id) => samePhase(id, candidate));
  return [...LETTERS]
    .map((letter) => `${base.toLowerCase()}${letter}`)
    .filter((candidate) => !taken(candidate))
    .slice(0, count);
}

export function familyOf(base: string, ids: readonly string[]): string[] {
  const child = new RegExp(`^${escapeRegExp(base)}[a-z]`, "i");
  return ids.filter((id) => samePhase(id, base) || child.test(id));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
