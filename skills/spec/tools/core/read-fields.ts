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
  return value === undefined ? undefined : wholeNumber(value, key, problems);
}

export function wholeNumber(value: unknown, key: string, problems: string[], min = 0): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= min) return value;
  problems.push(`${key} must be a whole number, ${min} or more`);
  return undefined;
}

export function requiredText(value: unknown, key: string, problems: string[]): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  problems.push(`${key} must be text`);
  return undefined;
}

export function optionalText(value: unknown, key: string, problems: string[]): string | undefined {
  return value === undefined ? undefined : requiredText(value, key, problems);
}

export function flag(value: unknown, key: string, problems: string[]): boolean | undefined {
  if (typeof value === "boolean") return value;
  problems.push(`${key} must be true or false`);
  return undefined;
}

// A document read back keeps only the fields it has, so it serializes the way it was written.
export function withoutUndefined<T extends Record<string, unknown>>(fields: T): T {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as T;
}
