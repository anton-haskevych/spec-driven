export type FrontmatterPatch = { kind: "ok"; text: string } | { kind: "invalid"; reason: string };

const FENCE = "---";
const CONTINUATION = /^[ \t]+\S/;

export function setFrontmatterLine(text: string, key: string, value: string): FrontmatterPatch {
  return patchKey(text, key, (lines, closing, range) => {
    const line = `${key}: ${value}`;
    if (!range) return [...lines.slice(0, closing), line, ...lines.slice(closing)];
    return [...lines.slice(0, range.start), line, ...lines.slice(range.end)];
  });
}

export function removeFrontmatterLine(text: string, key: string): FrontmatterPatch {
  return patchKey(text, key, (lines, _closing, range) => (range ? [...lines.slice(0, range.start), ...lines.slice(range.end)] : lines));
}

interface KeyRange {
  start: number;
  end: number;
}

type LineEdit = (lines: string[], closing: number, range: KeyRange | undefined) => string[];

function patchKey(text: string, key: string, edit: LineEdit): FrontmatterPatch {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== FENCE) return { kind: "invalid", reason: "entry has no frontmatter" };
  const closing = lines.findIndex((line, index) => index > 0 && line.trim() === FENCE);
  if (closing === -1) return { kind: "invalid", reason: "frontmatter has no closing ---" };
  return { kind: "ok", text: edit(lines, closing, keyRange(lines, closing, key)).join("\n") };
}

function keyRange(lines: readonly string[], closing: number, key: string): KeyRange | undefined {
  const start = lines.findIndex((candidate, index) => index > 0 && index < closing && candidate.startsWith(`${key}:`));
  if (start === -1) return undefined;
  let end = start + 1;
  while (end < closing && CONTINUATION.test(lines[end] ?? "")) end += 1;
  return { start, end };
}
