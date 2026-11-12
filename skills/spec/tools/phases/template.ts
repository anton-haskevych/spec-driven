export interface PhaseFileEdges {
  needs?: readonly string[];
  needsDeployed?: readonly string[];
  sameFilesAs?: readonly string[];
  pr?: string;
  code?: boolean;
}

export interface PhaseFileInput {
  id: string;
  title: string;
  edges: PhaseFileEdges;
  items?: readonly string[];
  // A joined spec: its tasks are on the board, so the file names no deliverables.
  onBoard?: boolean;
}

const PLACEHOLDER_ITEM = "- [ ] <specific deliverable>";
export const ON_BOARD = "The tasks are on the board: `phase tick <spec> <phase> <task-id>` closes one, `phase add --task` and `phase move` change them.";

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function phasePointer(id: string, title: string): string {
  return `phases/phase-${id.toLowerCase()}-${slugify(title)}.md`;
}

export function progressLine(id: string, title: string, pointer: string): string {
  return `- [ ] Phase ${id} — ${title} → \`${pointer}\``;
}

export function phaseFileText({ id, title, edges, items, onBoard }: PhaseFileInput): string {
  const deliverables = onBoard ? [ON_BOARD] : items && items.length > 0 ? items : [PLACEHOLDER_ITEM];
  return [
    frontmatter(edges),
    "",
    `# Phase ${id} — ${title}`,
    "",
    "**Goal:** <one-sentence phase goal>",
    "",
    "**Outcome:** <plain words: what changes for the user · cost · risk>",
    "",
    "**Files to touch:**",
    "- <path/to/file>",
    "",
    "## Implementation guidance",
    "",
    "<how to approach this phase>",
    "",
    "## Deliverables",
    "",
    ...deliverables,
    "",
  ].join("\n");
}

function frontmatter(edges: PhaseFileEdges): string {
  const lines = [`needs: ${idList(edges.needs ?? [])}`];
  if (edges.needsDeployed?.length) lines.push(`needs-deployed: ${idList(edges.needsDeployed)}`);
  if (edges.sameFilesAs?.length) lines.push(`same-files-as: ${idList(edges.sameFilesAs)}`);
  if (edges.pr) lines.push(`pr: ${edges.pr}`);
  if (edges.code === false) lines.push("code: false");
  return ["---", ...lines, "---"].join("\n");
}

function idList(ids: readonly string[]): string {
  return `[${ids.join(", ")}]`;
}
