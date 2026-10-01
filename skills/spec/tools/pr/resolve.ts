import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { findSpecs } from "../core/spec-folders";
import type { GhClient, GhResult } from "./gh";
import type { PrView } from "./types";

export interface ResolvedPr {
  view: PrView;
  otherPrs: number[];
}

const PR_NUMBER = /^#?(\d+)$/;
const SPEC_STATE = /^## Spec state\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m;
const PR_LINK = /\bPR #(\d+)|\/pull\/(\d+)/g;

export function specPrNumbers(prOpening: string): number[] {
  const section = SPEC_STATE.exec(prOpening)?.[1] ?? "";
  const numbers = [...section.matchAll(PR_LINK)].map((match) => Number(match[1] ?? match[2]));
  return [...new Set(numbers)];
}

export function resolvePr(gh: GhClient, projectDir: string, target: string | undefined): GhResult<ResolvedPr> {
  if (target === undefined) return withoutOthers(gh.prView());
  const number = PR_NUMBER.exec(target)?.[1];
  if (number) return withoutOthers(gh.prView(Number(number)));

  const [spec] = findSpecs(projectDir, target);
  if (!spec) return { ok: false, reason: `no PR number or spec named ${target}` };
  const numbers = specPrNumbers(readTextIfExists(join(spec.dir, "pr-opening.md")) ?? "");
  if (numbers.length === 0) return { ok: false, reason: `pr-opening.md for ${target} links no PR` };
  return latestOpenPr(gh, numbers);
}

// A spec often lists several PRs; the newest open one is the one being worked on.
function latestOpenPr(gh: GhClient, numbers: readonly number[]): GhResult<ResolvedPr> {
  let fallback: GhResult<PrView> = { ok: false, reason: `none of ${numbers.map((n) => `#${n}`).join(", ")} could be read` };
  for (const number of [...numbers].reverse()) {
    const view = gh.prView(number);
    if (view.ok && view.value.state === "OPEN") return withOthers(view.value, numbers);
    if (view.ok && !fallback.ok) fallback = view;
  }
  return fallback.ok ? withOthers(fallback.value, numbers) : fallback;
}

function withOthers(view: PrView, numbers: readonly number[]): GhResult<ResolvedPr> {
  return { ok: true, value: { view, otherPrs: numbers.filter((number) => number !== view.number) } };
}

function withoutOthers(view: GhResult<PrView>): GhResult<ResolvedPr> {
  return view.ok ? { ok: true, value: { view: view.value, otherPrs: [] } } : view;
}
