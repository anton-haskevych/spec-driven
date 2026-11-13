import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

const CODE_FLAG_VALUES: Record<string, boolean> = { true: true, false: false };

export function parseFlags<T extends ParseArgsOptionsConfig>(args: readonly string[], options: T) {
  try {
    return parseArgs({ args: [...args], options, allowPositionals: true, strict: true } as const);
  } catch {
    return undefined;
  }
}

export function parseCodeFlag(raw: string | undefined): boolean | undefined | string {
  if (raw === undefined) return undefined;
  return Object.hasOwn(CODE_FLAG_VALUES, raw) ? CODE_FLAG_VALUES[raw] : `--code must be true or false, not "${raw}"`;
}

export function idList(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((id) => id.trim()).filter(Boolean);
}
