import { isOpenItem, isTopLevelItem } from "../core/checkbox";
import { outlineMarkdown } from "../core/markdown";

export type ItemLocation = { kind: "found"; line: number } | { kind: "invalid"; reason: string };

interface OpenItem {
  line: number;
  text: string;
}

const FENCE = /^\s*(```|~~~)/;
const NTH = /^#(\d+)$/;
const CHECKBOX_PREFIX = /^\s*[-*+]\s+\[.\]\s+/;

export function locatePhaseLine(progress: string, pointer: string): number | undefined {
  return linesOutsideFences(progress).find(({ text }) => isTopLevelItem(text) && text.includes(pointer))?.line;
}

export function locateOpenItem(entry: string, selector: string): ItemLocation {
  const items = openItems(entry);
  const nth = NTH.exec(selector.trim());
  if (nth) return byPosition(items, Number(nth[1]));
  return byPrefix(items, normalized(plainText(selector)));
}

function byPosition(items: readonly OpenItem[], position: number): ItemLocation {
  const item = items[position - 1];
  if (position >= 1 && item) return { kind: "found", line: item.line };
  return { kind: "invalid", reason: `no open item #${position}. ${listItems(items)}` };
}

function byPrefix(items: readonly OpenItem[], prefix: string): ItemLocation {
  const exact = items.filter((item) => normalized(item.text) === prefix);
  const matches = exact.length === 1 ? exact : items.filter((item) => normalized(item.text).startsWith(prefix));
  const [only] = matches;
  if (matches.length === 1 && only) return { kind: "found", line: only.line };
  if (matches.length === 0) return { kind: "invalid", reason: `no open item starts with "${prefix}". ${listItems(items)}` };
  return { kind: "invalid", reason: `"${prefix}" matches ${matches.length} open items; use more words or #N. ${listItems(matches, items)}` };
}

function listItems(shown: readonly OpenItem[], all: readonly OpenItem[] = shown): string {
  if (shown.length === 0) return "No open items.";
  const lines = shown.map((item) => `#${all.indexOf(item) + 1} ${item.text}`);
  return `Open items:\n${lines.join("\n")}`;
}

function openItems(entry: string): OpenItem[] {
  return linesOutsideFences(entry)
    .filter(({ text }) => isOpenItem(text))
    .map(({ line, text }) => ({ line, text: plainText(text.replace(CHECKBOX_PREFIX, "")) }));
}

function linesOutsideFences(text: string): { line: number; text: string }[] {
  let inFence = false;
  return text.split("\n").flatMap((lineText, line) => {
    if (FENCE.test(lineText)) {
      inFence = !inFence;
      return [];
    }
    return inFence ? [] : [{ line, text: lineText }];
  });
}

function plainText(inlineMarkdown: string): string {
  return outlineMarkdown(`- [ ] ${inlineMarkdown.trim()}`).tasks[0]?.text ?? inlineMarkdown.trim();
}

function normalized(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}
