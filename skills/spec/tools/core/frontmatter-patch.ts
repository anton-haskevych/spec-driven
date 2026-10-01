export type FrontmatterPatch = { kind: "ok"; text: string } | { kind: "invalid"; reason: string };

const FENCE = "---";
const CONTINUATION = /^[ \t]+\S/;

export function setFrontmatterLine(text: string, key: string, value: string): FrontmatterPatch {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== FENCE) return { kind: "invalid", reason: "entry has no frontmatter" };
  const closing = lines.findIndex((line, index) => index > 0 && line.trim() === FENCE);
  if (closing === -1) return { kind: "invalid", reason: "frontmatter has no closing ---" };

  const line = `${key}: ${value}`;
  const start = lines.findIndex((candidate, index) => index > 0 && index < closing && candidate.startsWith(`${key}:`));
  if (start === -1) return { kind: "ok", text: [...lines.slice(0, closing), line, ...lines.slice(closing)].join("\n") };

  let end = start + 1;
  while (end < closing && CONTINUATION.test(lines[end] ?? "")) end += 1;
  return { kind: "ok", text: [...lines.slice(0, start), line, ...lines.slice(end)].join("\n") };
}
