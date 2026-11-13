import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { resolveSpec } from "../core/spec-folders";
import type { SpecState } from "../core/spec-state";
import type { Result } from "../core/result";
import type { PrDoc } from "../plan/docs/pr-doc";
import type { SpecPlans } from "../plan/read-plans";
import { specOfBranch, treeName } from "../trees/naming";
import type { GhClient } from "./gh";
import type { PrView } from "./checks/types";
import { pickGroup, prGroups } from "./groups";

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

// A spec on layout 2 keeps its PR numbers on the record; before that, in pr-opening.md's Spec state.
export function linkedPrNumbers(prOpening: string | undefined, prs: readonly PrDoc[] | undefined): number[] {
  if (!prs) return specPrNumbers(prOpening ?? "");
  return prs.flatMap((doc) => doc.number ?? []).toSorted((a, b) => a - b);
}

// The spec a pr command names, or the one its PR's branch names.
export function specOfTarget(target: readonly string[], view: Pick<PrView, "headRefName">): string | undefined {
  const [first] = target;
  return first !== undefined && parsePrNumber(first) === undefined ? first : specOfBranch(view.headRefName);
}

export function parsePrNumber(target: string): number | undefined {
  const number = PR_NUMBER.exec(target)?.[1];
  return number === undefined ? undefined : Number(number);
}

// `target` is [], [<pr>], [<spec>] or [<spec>, <group>].
export function resolvePr(gh: GhClient, projectDir: string, target: readonly string[], plans: SpecPlans): Result<ResolvedPr> {
  const [first, group] = target;
  if (first === undefined) return withoutOthers(gh.prView());
  const number = parsePrNumber(first);
  if (number !== undefined) return withoutOthers(gh.prView(number));

  const spec = resolveSpec(projectDir, first);
  if (typeof spec === "string") return { ok: false, reason: spec };
  return resolveGroupPr(gh, plans.state(spec), plans.prs(spec.name), group);
}

// By branch, so a command aimed at group A never lands on group B's PR. Spec-state links are the
// fallback only for a single-group spec, where the newest-open rule can't pick another group's PR.
function resolveGroupPr(gh: GhClient, state: SpecState, prs: readonly PrDoc[] | undefined, requested: string | undefined): Result<ResolvedPr> {
  const { spec } = state;
  const group = pickGroup(state, requested);
  if (!group.ok) return group;
  const linked = linkedPrNumbers(readTextIfExists(join(spec.dir, "pr-opening.md")), prs);
  const byBranch = gh.prView(treeName(spec.name, group.value.name).branch);
  if (byBranch.ok) return withOthers(byBranch.value, linked);
  if (prGroups(state).length > 1) return byBranch;
  if (linked.length === 0) return { ok: false, reason: `${byBranch.reason}; ${prs ? "the board" : "pr-opening.md"} for ${spec.name} links no PR` };
  return latestOpenPr(gh, linked);
}

// A spec often lists several PRs; the newest open one is the one being worked on.
function latestOpenPr(gh: GhClient, numbers: readonly number[]): Result<ResolvedPr> {
  let fallback: Result<PrView> = { ok: false, reason: `none of ${numbers.map((n) => `#${n}`).join(", ")} could be read` };
  for (const number of [...numbers].reverse()) {
    const view = gh.prView(number);
    if (view.ok && view.value.state === "OPEN") return withOthers(view.value, numbers);
    if (view.ok && !fallback.ok) fallback = view;
  }
  return fallback.ok ? withOthers(fallback.value, numbers) : fallback;
}

function withOthers(view: PrView, numbers: readonly number[]): Result<ResolvedPr> {
  return { ok: true, value: { view, otherPrs: numbers.filter((number) => number !== view.number) } };
}

function withoutOthers(view: Result<PrView>): Result<ResolvedPr> {
  return view.ok ? { ok: true, value: { view: view.value, otherPrs: [] } } : view;
}
