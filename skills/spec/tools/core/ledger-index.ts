export interface IndexRow {
  section?: string;
  file: string;
  tail: string;
  line: string;
}

const ROW = /^\s*[-*]\s+`([^`]+\.md)`\s*(.*)$/;
const SECTION = /^##\s+(.+?)\s*$/;
const HEADING = /^#{1,2}\s/;
const SEPARATOR = " — ";

export function parseIndexRows(text: string): IndexRow[] {
  const rows: IndexRow[] = [];
  let section: string | undefined;
  for (const line of text.split("\n")) {
    section = SECTION.exec(line)?.[1] ?? section;
    const match = ROW.exec(line);
    if (match?.[1] !== undefined) rows.push({ section, file: match[1], tail: (match[2] ?? "").trim(), line: line.trim() });
  }
  return rows;
}

export function insertRow(text: string, row: string, section?: string): string {
  if (section === undefined) return appendLines(text, [row]);
  const lines = text.split("\n");
  const heading = lines.findIndex((line) => sameSection(SECTION.exec(line)?.[1], section));
  if (heading === -1) return appendLines(text, ["", `## ${section}`, row]);

  const next = lines.findIndex((line, index) => index > heading && HEADING.test(line));
  const end = next === -1 ? lines.length : next;
  let insertAt = heading + 1;
  for (let index = heading + 1; index < end; index += 1) {
    if (ROW.test(lines[index] ?? "")) insertAt = index + 1;
  }
  return [...lines.slice(0, insertAt), row, ...lines.slice(insertAt)].join("\n");
}

export function kindSection(kind: string): string {
  const title = kind.charAt(0).toUpperCase() + kind.slice(1);
  return title.endsWith("s") ? title : `${title}s`;
}

export function formatSpecRow(file: string, tags: readonly string[], summary: string): string {
  return `- \`${file}\`${SEPARATOR}[${tags.join(", ")}]${SEPARATOR}${summary}`;
}

export function formatProjectRow(file: string, paths: readonly string[], summary: string): string {
  const pathColumn = paths.length > 0 ? `\`${paths.join(", ")}\`${SEPARATOR}` : "";
  return `- \`${file}\`${SEPARATOR}${pathColumn}${summary}`;
}

export function formatPointerRow(lessonPath: string, summary: string): string {
  return formatSpecRow(lessonPath, ["general"], summary);
}

function sameSection(heading: string | undefined, section: string): boolean {
  return heading !== undefined && singular(heading) === singular(section);
}

function singular(title: string): string {
  return title.trim().toLowerCase().replace(/s$/, "");
}

function appendLines(text: string, added: readonly string[]): string {
  return `${[text.trimEnd(), ...added].join("\n")}\n`;
}
