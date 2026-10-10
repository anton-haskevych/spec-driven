import { join } from "node:path";
import { readTextIfExists } from "../../core/files";
import { gitAt } from "../../core/git";
import { landOnMain, type MainEditPlan } from "../../core/land-on-main";
import { defaultBranch, type Runner } from "../../core/run";
import { findSpecs } from "../../core/spec-folders";
import { loadSettings, type MergeMethod, type ProjectSettings } from "../../playbook/settings";
import { specOfBranch } from "../../trees/naming";
import { babysitLogger } from "../babysit/log";
import { waitStep } from "../babysit/wait-step";
import type { PrView } from "../checks/types";
import { externalMatcher } from "../checks/verdict";
import { ghClient } from "../gh";
import { parsePrNumber, resolvePr } from "../resolve";
import { ghWrites } from "./gh-writes";
import { withMergeLine, type MergeRecord } from "./merge-line";

export interface MergeRequest {
  target: readonly string[];
  now: boolean;
  method?: MergeMethod;
  date?: string;
}

export interface MergeDeps {
  runner: Runner;
  now: () => Date;
}

interface Merged {
  view: PrView;
  sha: string;
  method?: MergeMethod;
}

const SHORT_SHA = 7;
const NO_METHOD = "pr merge: pr.merge is not set; pass --method or set it in docs/specs/_playbook/settings.md";

export async function mergePr(projectDir: string, request: MergeRequest, deps: MergeDeps): Promise<string> {
  const resolved = resolvePr(ghClient(projectDir, deps.runner), projectDir, request.target);
  if (!resolved.ok) return `pr merge: ${resolved.reason}`;
  const { view } = resolved.value;
  const settings = loadSettings(projectDir);
  const method = request.method ?? settings.pr.merge;

  if (view.state === "MERGED") {
    if (!view.mergeCommit) return `pr merge: #${view.number} is merged but GitHub gave no merge commit`;
    return recordMerge(projectDir, request, deps, { view, sha: view.mergeCommit, ...(method ? { method } : {}) });
  }
  if (view.state === "CLOSED") return `pr merge: #${view.number} is closed, not merged`;
  const blocker = request.now ? undefined : notGreen(view, settings, deps.now());
  if (blocker) return `pr merge: not green — ${blocker}`;
  if (!method) return NO_METHOD;

  const merged = ghWrites(projectDir, deps.runner).merge(view.number, method, view.headRefOid);
  if (!merged.merged) return `pr merge: ${merged.status ? `GitHub refused (${merged.status}) — ` : ""}${merged.message}`;
  babysitLogger(gitAt(projectDir, deps.runner), deps.now)(view.number, { event: "merged", sha: short(merged.sha), detail: `${method} · ${short(merged.sha)}` });
  return recordMerge(projectDir, request, deps, { view, sha: merged.sha, method });
}

// The same reading pr wait settles on, so "green" means one thing everywhere.
function notGreen(view: PrView, settings: ProjectSettings, now: Date): string | undefined {
  const step = waitStep(view, { isExternal: externalMatcher(settings.checks.external), startedMs: now.getTime() }, now.getTime());
  if (!("settle" in step)) return step.waiting;
  return step.settle.event === "green" ? undefined : (step.settle.detail ?? step.settle.event);
}

async function recordMerge(projectDir: string, request: MergeRequest, deps: MergeDeps, merged: Merged): Promise<string> {
  const { view, sha, method } = merged;
  const result = `Merged: #${view.number} · ${method ? `${method} · ` : ""}${short(sha)}`;
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return `${result}\npr merge: merged; merge line not landed — no default branch`;
  const spec = specName(request.target) ?? specOfBranch(view.headRefName);
  if (!spec) return `${result}\npr merge: merged; merge line not landed — ${view.headRefName} names no spec`;

  const record: MergeRecord = { pr: view.number, date: request.date ?? localDate(deps.now()), sha, ...(method ? { method } : {}) };
  const landing = await landOnMain(gitAt(projectDir, deps.runner), branch, (dir) => mergeLineEdit(dir, branch, spec, record));
  return landing.kind === "landed" || landing.kind === "unchanged" ? result : `${result}\npr merge: merged; merge line not landed — ${landing.reason}`;
}

function mergeLineEdit(projectDir: string, branch: string, spec: string, record: MergeRecord): MainEditPlan<number> {
  const [folder, ...others] = findSpecs(projectDir, spec);
  if (!folder) return { kind: "refused", reason: `no spec named ${spec} on origin/${branch}` };
  if (others.length > 0) return { kind: "refused", reason: `${others.length + 1} specs are named ${spec} on origin/${branch}` };
  const file = join(folder.dir, "pr-opening.md");
  const text = readTextIfExists(file);
  if (text === undefined) return { kind: "refused", reason: `${spec} has no pr-opening.md on origin/${branch}` };
  const edit = withMergeLine(text, record);
  return edit.kind === "write" ? { ...edit, file, message: `docs(spec): ${spec} PR #${record.pr} merged`, landed: record.pr } : edit;
}

function specName(target: readonly string[]): string | undefined {
  const [first] = target;
  return first === undefined || parsePrNumber(first) !== undefined ? undefined : first;
}

function localDate(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

function short(sha: string): string {
  return sha.slice(0, SHORT_SHA);
}
