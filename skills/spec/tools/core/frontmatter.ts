export type FrontmatterData = Record<string, unknown>;

export type FrontmatterResult =
  | { kind: "none"; body: string }
  | { kind: "ok"; data: FrontmatterData; body: string }
  | { kind: "invalid"; error: string };

const FENCE = "---";

export function parseFrontmatter(text: string): FrontmatterResult {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== FENCE) return { kind: "none", body: text };

  const closing = lines.findIndex((line, index) => index > 0 && line.trim() === FENCE);
  if (closing === -1) return { kind: "invalid", error: "frontmatter has no closing ---" };

  const yaml = lines.slice(1, closing).join("\n");
  const body = lines.slice(closing + 1).join("\n");
  return parseYamlBlock(yaml, body);
}

function parseYamlBlock(yaml: string, body: string): FrontmatterResult {
  try {
    const data: unknown = Bun.YAML.parse(yaml);
    if (!isRecord(data)) return { kind: "invalid", error: "frontmatter is not a key/value map" };
    return { kind: "ok", data, body };
  } catch (cause) {
    return { kind: "invalid", error: `frontmatter is not valid YAML (${describe(cause)})` };
  }
}

export function isRecord(value: unknown): value is FrontmatterData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringField(data: FrontmatterData, key: string): string | undefined {
  const value = data[key];
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
