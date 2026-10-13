import { readFileSync } from "node:fs";
import type { Runner } from "../../core/run";
import { ghClient } from "../gh";
import { resolvePr } from "../resolve";
import { ghWrites } from "./gh-writes";

export const HOLD_LABEL = "hold-for-review";
const HOLD_LABEL_DESCRIPTION = "Green; waiting for a human review before merge";
const SECTION_HEADING = "## How to review";

export interface HoldRequest {
  target: readonly string[];
  howToReview: string;
}

export interface HoldDeps {
  runner: Runner;
}

export function holdPr(projectDir: string, request: HoldRequest, deps: HoldDeps): string {
  const resolved = resolvePr(ghClient(projectDir, deps.runner), projectDir, request.target);
  if (!resolved.ok) return `pr hold: ${resolved.reason}`;
  const { number, state } = resolved.value.view;
  if (state !== "OPEN") return `pr hold: #${number} is ${state.toLowerCase()}`;

  const writes = ghWrites(projectDir, deps.runner);
  const body = writes.body(number);
  if (!body.ok) return `pr hold: ${body.reason}`;
  const section = withHeading(readFileSync(request.howToReview, "utf8"));
  const written = writes.setBody(number, withHowToReview(body.value, section));
  if (!written.ok) return `pr hold: ${written.reason}`;
  const labelled = writes.label(number, HOLD_LABEL, HOLD_LABEL_DESCRIPTION);
  if (!labelled.ok) return `pr hold: ${labelled.reason}`;
  return `Held: #${number} · label ${HOLD_LABEL} · How to review in the PR`;
}

// A rerun replaces the section instead of adding a second one.
export function withHowToReview(body: string, section: string): string {
  const lines = body.trimEnd().split("\n");
  const start = lines.findIndex((line) => line.trim() === SECTION_HEADING);
  const sectionText = section.trimEnd();
  if (start === -1) return body.trim() ? `${body.trimEnd()}\n\n${sectionText}\n` : `${sectionText}\n`;
  const nextHeading = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const before = lines.slice(0, start).join("\n");
  const after = nextHeading === -1 ? "" : `\n\n${lines.slice(nextHeading).join("\n")}`;
  return `${before}${before ? "\n" : ""}${sectionText}${after}\n`;
}

function withHeading(text: string): string {
  return text.trimStart().startsWith(SECTION_HEADING) ? text : `${SECTION_HEADING}\n${text}`;
}
