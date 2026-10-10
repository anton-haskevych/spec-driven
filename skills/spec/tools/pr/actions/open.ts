import { relative } from "node:path";
import { gitAt, stateDir, type Git } from "../../core/git";
import { resolveSpec } from "../../core/spec-folders";
import { loadSpecState } from "../../core/spec-state";
import { defaultBranch, type Runner } from "../../core/run";
import type { Result } from "../../core/result";
import { pushBranch } from "../../publish/push";
import { treeName } from "../../trees/naming";
import { appendEvent, type BabysitEvent } from "../babysit/log";
import type { PollClock } from "../babysit/poll";
import type { PrView } from "../checks/types";
import { ghClient } from "../gh";
import { pickGroup, type PrGroup } from "../groups";
import { ghWrites } from "./gh-writes";
import { prBody, prTitle } from "./pr-text";
import { markReadySafely, type ReadyOutcome } from "./ready-race";

export interface OpenRequest {
  spec: string;
  group?: string;
  draft: boolean;
}

export interface OpenDeps {
  runner: Runner;
  clock: PollClock;
  now: () => Date;
}

const SHORT_SHA = 7;

export async function openPr(projectDir: string, request: OpenRequest, deps: OpenDeps): Promise<string> {
  const spec = resolveSpec(projectDir, request.spec);
  if (typeof spec === "string") return `pr open: ${spec}`;
  const group = pickGroup(loadSpecState(spec), request.group);
  if (!group.ok) return `pr open: ${group.reason}`;

  const branch = treeName(spec.name, group.value.name).branch;
  const git = gitAt(projectDir, deps.runner);
  const log = babysitLogger(git, deps.now);
  const existing = ghClient(projectDir, deps.runner).prView(branch);
  if (existing.ok && existing.value.state === "OPEN") return reportOrMarkReady(existing.value, request.draft, projectDir, deps, log);

  const opened = createPr(projectDir, git, branch, { path: relative(projectDir, spec.dir), name: spec.name, group: group.value }, request.draft, deps.runner);
  if (!opened.ok) return `pr open: ${opened.reason}`;
  const { number, url, sha } = opened.value;
  const kind = request.draft ? "draft" : "ready";
  log(number, { event: "opened", sha, detail: `${kind} · head ${sha}` });
  return `PR: #${number} ${request.draft ? "opened as a draft" : "opened ready"} · ${url}`;
}

async function reportOrMarkReady(view: PrView, keepDraft: boolean, projectDir: string, deps: OpenDeps, log: BabysitLogger): Promise<string> {
  if (!view.isDraft) return `PR: #${view.number} already open · ${view.url}`;
  if (keepDraft) return `PR: #${view.number} already open as a draft · ${view.url}`;
  const reads = ghClient(projectDir, deps.runner);
  const outcome = await markReadySafely(view.number, view.headRefOid, { reads, writes: ghWrites(projectDir, deps.runner), clock: deps.clock });
  if (!outcome.ok) return `pr open: ${outcome.reason}`;
  const sha = view.headRefOid.slice(0, SHORT_SHA);
  const detail = readyDetail(outcome.value, sha);
  log(view.number, { event: "ready", sha, detail });
  return `PR: #${view.number} marked ready · ${detail}`;
}

function readyDetail(outcome: ReadyOutcome, sha: string): string {
  switch (outcome.kind) {
    case "started":
      return `CI started (run ${outcome.runId})`;
    case "skipped":
      return `CI skipped on ${sha} — push a new commit`;
    case "no-run":
      return `no CI run on ${sha} after ${outcome.waitedMs / 1000}s`;
  }
}

interface SpecForPr {
  path: string;
  name: string;
  group: PrGroup;
}

function createPr(projectDir: string, git: Git, branch: string, spec: SpecForPr, draft: boolean, runner: Runner): Result<{ number: number; url: string; sha: string }> {
  const current = git.out(["symbolic-ref", "--short", "-q", "HEAD"]);
  if (current.ok && current.value !== branch) return { ok: false, reason: `this tree is on ${current.value}, not ${branch} — run it in that branch's tree` };
  const base = defaultBranch(projectDir, runner);
  if (!base) return { ok: false, reason: "no default branch (origin/HEAD unset and gh repo view failed)" };
  const pushed = pushBranch(git, base);
  if (!pushed.ok) return { ok: false, reason: `push failed — ${pushed.reason}` };
  const sha = git.out(["rev-parse", `--short=${SHORT_SHA}`, "HEAD"]);
  const created = ghWrites(projectDir, runner).create({ base, head: branch, title: prTitle(spec.name, spec.group), body: prBody(spec.path, spec.group), draft });
  return created.ok ? { ok: true, value: { ...created.value, sha: sha.ok ? sha.value : "" } } : created;
}

type BabysitLogger = (pr: number, event: Omit<BabysitEvent, "at">) => void;

// The log is for reading only; a clone where it can't be written still opens the PR.
function babysitLogger(git: Git, now: () => Date): BabysitLogger {
  const dir = stateDir(git, "babysit");
  return (pr, event) => {
    if (dir.ok) appendEvent(dir.value, pr, { at: now().toISOString(), ...event });
  };
}
