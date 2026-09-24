import { join } from "node:path";
import { parseFrontmatter } from "../core/frontmatter";
import type { PhaseState, SpecState } from "../core/spec-state";
import { error, warning, type Issue } from "./issue";

const TICKED_ITEM = /^\s*[-*+]\s+\[[xX]\]\s+(.+)$/;
const EVIDENCE = /\d{4}-\d{2}-\d{2}|https?:\/\/|`[^`]+`|\S+\/\S+/;
const SELF_CHECK = /\b(verif\w*|qa|manual test\w*|smoke test\w*|open (a )?pr|pull request)\b/i;

export function taskPhaseIssues(state: SpecState, onlyPointer?: string): Issue[] {
  return state.phases
    .filter((phase) => !onlyPointer || phase.pointer === onlyPointer)
    .flatMap((phase) => checkPhase(join(state.spec.dir, phase.pointer), phase));
}

function checkPhase(file: string, phase: PhaseState): Issue[] {
  const parsed = parseFrontmatter(phase.entry ?? "");
  const rawCode = parsed.kind === "ok" ? parsed.data.code : undefined;
  if (rawCode !== undefined && typeof rawCode !== "boolean") {
    return [error(file, `code must be true or false, not "${String(rawCode)}"`)];
  }
  if (phase.code) return [];

  const issues: Issue[] = [];
  if (SELF_CHECK.test(phase.name)) {
    issues.push(warning(file, `task phase "${phase.name}" looks like checking our own work; that belongs in pr-opening.md, not a phase`));
  }
  if (phase.edges.pr) {
    issues.push(warning(file, `task phase has pr: ${phase.edges.pr}, but task phases open no PR; drop the field`));
  }
  const body = parsed.kind === "invalid" ? "" : parsed.body;
  return [...issues, ...unevidencedItems(body).map((item) => warning(file, `ticked "${item}" without evidence; add a link, date or file after it`))];
}

function unevidencedItems(body: string): string[] {
  return body.split("\n").flatMap((line) => {
    const item = TICKED_ITEM.exec(line)?.[1]?.trim();
    return item && !EVIDENCE.test(item) ? [item] : [];
  });
}
