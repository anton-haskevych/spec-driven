// `## <heading>` sections of a markdown note: read one, or replace one and leave the rest byte-identical.

export function sectionLines(text: string, heading: string): string[] {
  const lines = text.split("\n");
  const range = sectionRange(lines, heading);
  return range ? lines.slice(range.start + 1, range.end).filter((line) => line.trim() !== "") : [];
}

// A missing section is appended at the end.
export function withSection(text: string, heading: string, body: readonly string[]): string {
  const lines = text.trimEnd().split("\n");
  const block = [`## ${heading}`, ...body, ""];
  const range = sectionRange(lines, heading);
  if (!range) return `${[...lines, "", ...block].join("\n")}\n`.replace(/\n+$/, "\n");
  return `${[...lines.slice(0, range.start), ...block, ...lines.slice(range.end)].join("\n").trimEnd()}\n`;
}

// The indented lines right under a list item.
export function childLines(lines: readonly string[], parent: number): readonly string[] {
  const following = lines.slice(parent + 1);
  const end = following.findIndex((line) => !/^\s/.test(line));
  return end === -1 ? following : following.slice(0, end);
}

function sectionRange(lines: readonly string[], heading: string): { start: number; end: number } | undefined {
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return undefined;
  const next = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return { start, end: next === -1 ? lines.length : next };
}
