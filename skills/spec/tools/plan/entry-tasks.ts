import { hasEvidence } from "../core/checkbox";
import { parseFrontmatter } from "../core/frontmatter";
import { isGateItem } from "../core/gate";

// A deliverable as its phase file writes it: markdown kept, the ` — ` evidence split off a ticked one.
export interface EntryTask {
  text: string;
  done: boolean;
  evidence?: string;
  gate: boolean;
}

const FENCE = /^\s*(```|~~~)/;
const SECTION = /^##\s+(.*?)\s*$/;
const CHECKBOX = /^\s*[-*+]\s+\[([ xX])\]\s+(.*?)\s*$/;
const DELIVERABLES = /^deliverables\b/i;
const EVIDENCE_SEPARATOR = " — ";

// The Deliverables section's checkboxes when it has any, else every checkbox: the rule of
// core/phase-entry.ts, read from raw lines because the rendered outline drops backticks.
export function entryTasks(entry: string): EntryTask[] {
  const items = checkboxLines(bodyOf(entry));
  const deliverables = items.filter((item) => DELIVERABLES.test(item.section));
  return (deliverables.length > 0 ? deliverables : items).map(({ text, done }) => ({ ...splitEvidence(text, done), done, gate: isGateItem(text) }));
}

// What two copies of one task share however each was formatted.
export function taskKey(text: string): string {
  return text.replace(/[`*_]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function bodyOf(entry: string): string {
  const parsed = parseFrontmatter(entry);
  return parsed.kind === "ok" ? parsed.body : entry;
}

function checkboxLines(body: string): { section: string; text: string; done: boolean }[] {
  let section = "";
  let inFence = false;
  return body.split("\n").flatMap((line) => {
    if (FENCE.test(line)) inFence = !inFence;
    if (inFence || FENCE.test(line)) return [];
    const heading = SECTION.exec(line);
    if (heading) section = heading[1] ?? "";
    const box = CHECKBOX.exec(line);
    return box ? [{ section, text: box[2] ?? "", done: box[1] !== " " }] : [];
  });
}

function splitEvidence(text: string, done: boolean): { text: string; evidence?: string } {
  const at = text.lastIndexOf(EVIDENCE_SEPARATOR);
  const evidence = at === -1 ? "" : text.slice(at + EVIDENCE_SEPARATOR.length).trim();
  return done && evidence !== "" && hasEvidence(evidence) ? { text: text.slice(0, at).trim(), evidence } : { text };
}
