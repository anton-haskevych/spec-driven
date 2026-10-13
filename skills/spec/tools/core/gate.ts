import { tickedItemText } from "./checkbox";

// `gate:` in a phase's frontmatter: the phase needs a person's approval before it goes on.
// design = the design is agreed before building; outward = it goes out (publish, send, deploy) on a person's word.
export const GATE_KINDS = ["design", "outward"] as const;
export type GateKind = (typeof GATE_KINDS)[number];

const GATE_ITEM = /^(?:\d[\w.]*\s+)?Gate:\s/;
const OPEN_ITEM_TEXT = /^\s*[-*+]\s+\[ \]\s+(.+?)\s*$/;

export function isGateKind(value: unknown): value is GateKind {
  return typeof value === "string" && (GATE_KINDS as readonly string[]).includes(value);
}

// A deliverable that records the approval, e.g. `- [ ] Gate: design agreed with Anton`.
export function isGateItem(text: string): boolean {
  return GATE_ITEM.test(text);
}

export function gateItemText(line: string): string | undefined {
  const text = OPEN_ITEM_TEXT.exec(line)?.[1] ?? tickedItemText(line);
  return text !== undefined && isGateItem(text) ? text : undefined;
}
