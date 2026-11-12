// Readers for one field of parsed YAML or JSON: each returns the value or records why it can't.

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], key: string, problems: string[]): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  const choices = allowed.length === 2 ? allowed.join(" or ") : `${allowed.slice(0, -1).join(", ")} or ${allowed.at(-1)}`;
  problems.push(`${key} must be ${choices}, not "${String(value)}"`);
  return undefined;
}

export function stringArray(value: unknown, key: string, problems: string[]): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  problems.push(`${key} must be a list of strings, e.g. ${key}: ["Vercel*"]`);
  return [];
}

export function count(value: unknown, key: string, problems: string[]): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  problems.push(`${key} must be a whole number, 0 or more`);
  return undefined;
}
