const OPEN_ITEM = /^(\s*[-*+]\s+)\[ \](\s+.*?)\s*$/;
const TICKED_ITEM = /^\s*[-*+]\s+\[[xX]\]\s+(.+)$/;
const TOP_LEVEL_ITEM = /^[-*+]\s+\[[ xX]\]\s/;
const EVIDENCE = /\d{4}-\d{2}-\d{2}|https?:\/\/|`[^`]+`|\S+\/\S+/;
const EVIDENCE_SEPARATOR = " — ";

export function isOpenItem(line: string): boolean {
  return OPEN_ITEM.test(line);
}

export function isTopLevelItem(line: string): boolean {
  return TOP_LEVEL_ITEM.test(line);
}

export function tickedItemText(line: string): string | undefined {
  return TICKED_ITEM.exec(line)?.[1]?.trim();
}

export function hasEvidence(text: string): boolean {
  return EVIDENCE.test(text);
}

export function formatTickedItem(openLine: string, evidence?: string): string {
  const match = OPEN_ITEM.exec(openLine);
  if (!match) throw new Error(`not an open checkbox item: ${openLine}`);
  const [, bullet, text] = match;
  const suffix = evidence === undefined ? "" : `${EVIDENCE_SEPARATOR}${evidence}`;
  return `${bullet}[x]${text}${suffix}`;
}
