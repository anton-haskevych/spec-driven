import type { MergeMethod } from "../../playbook/settings";

export interface MergeRecord {
  pr: number;
  date: string;
  sha: string;
  method?: MergeMethod;
}

export type MergeLineEdit = { kind: "write"; text: string } | { kind: "unchanged" | "refused"; reason: string };

const SHORT_SHA = 7;
const SPEC_STATE_HEADING = /^## Spec state\s*$/;
const NEXT_SECTION = /^## /;

// `PR #n` keeps the form specPrNumbers and the board's link parse read.
export function mergeLine({ pr, date, sha, method }: MergeRecord): string {
  return `PR #${pr} merged ${date} as ${sha.slice(0, SHORT_SHA)}${method ? ` (${method})` : ""}.`;
}

export function withMergeLine(prOpening: string, record: MergeRecord): MergeLineEdit {
  const lines = prOpening.split("\n");
  const start = lines.findIndex((line) => SPEC_STATE_HEADING.test(line));
  if (start < 0) return { kind: "refused", reason: "pr-opening.md has no Spec state section" };
  const next = lines.findIndex((line, index) => index > start && NEXT_SECTION.test(line));
  const end = next < 0 ? lines.length : next;
  const section = lines.slice(start + 1, end);
  if (section.some((line) => line.includes(`PR #${record.pr} merged`))) return { kind: "unchanged", reason: `PR #${record.pr}'s merge line is already in Spec state` };

  const lastText = start + 1 + section.findLastIndex((line) => line.trim() !== "");
  const at = lastText > start ? lastText + 1 : start + 1;
  const tail = lines.slice(at);
  const text = [...lines.slice(0, at), mergeLine(record), ...(tail.length === 0 ? [""] : tail)].join("\n");
  return { kind: "write", text };
}
