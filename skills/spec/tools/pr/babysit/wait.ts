import { firstLine, gitAt, stateDir, type Git } from "../../core/git";
import type { Result } from "../../core/result";
import type { Runner } from "../../core/run";
import { loadSettings } from "../../playbook/settings";
import type { PrView } from "../checks/types";
import { externalMatcher } from "../checks/verdict";
import { shortDuration } from "../durations";
import { ghClient, PR_FIELDS } from "../gh";
import { GH_TIMEOUT_MS } from "../gh-lists";
import { parseJson, toPrView } from "../gh-records";
import { resolvePr } from "../resolve";
import { appendEvent, readEvents, type BabysitEvent } from "./log";
import { pollUntil, type PollClock } from "./poll";
import { settleLine, waitStep, type Settle, type WaitContext, type WaitStep } from "./wait-step";

export interface WaitRequest {
  target: readonly string[];
  sha?: string;
  since?: string;
  timeoutMs: number;
  intervalMs: number;
}

export interface WaitDeps {
  runner: Runner;
  clock: PollClock;
}

interface Poll {
  step: WaitStep;
  head?: string;
}

const SHORT_SHA = 7;

export async function waitForPr(projectDir: string, request: WaitRequest, deps: WaitDeps): Promise<string> {
  const { runner, clock } = deps;
  const resolved = resolvePr(ghClient(projectDir, runner), projectDir, request.target);
  if (!resolved.ok) return `pr wait: ${resolved.reason}`;
  const { view } = resolved.value;
  const git = gitAt(projectDir, runner);
  const logDir = stateDir(git, "babysit");
  if (!logDir.ok) return `pr wait: ${logDir.reason}`;

  const log = (settle: Settle, head: string | undefined) => {
    const event: BabysitEvent = { at: new Date(clock.now()).toISOString(), event: settle.event, ...(head ? { sha: head.slice(0, SHORT_SHA) } : {}) };
    appendEvent(logDir.value, view.number, settle.detail ? { ...event, detail: settle.detail } : event);
  };
  const sha = request.sha ?? treeHead(git, view);
  const context: WaitContext = {
    ...(sha ? { sha } : {}),
    ...withSince(request.since ?? lastPushOrRerun(readEvents(logDir.value, view.number).events)),
    isExternal: externalMatcher(loadSettings(projectDir).checks.external),
    startedMs: clock.now(),
  };
  log({ event: "waiting", detail: `${view.checks.length} checks${sha ? ` · for ${sha.slice(0, SHORT_SHA)}` : ""}` }, view.headRefOid);

  const poll = (): Poll => {
    const fresh = readView(runner, projectDir, view.number);
    if (!fresh.ok) return { step: { waiting: `gh: ${fresh.reason}` } };
    return { step: waitStep(fresh.value, context, clock.now()), head: fresh.value.headRefOid };
  };
  const { value: last } = await pollUntil(poll, ({ step }) => "settle" in step, { intervalMs: request.intervalMs, timeoutMs: request.timeoutMs, clock });
  const settle: Settle = "settle" in last.step ? last.step.settle : { event: "timeout", detail: `after ${shortDuration(request.timeoutMs)} · ${last.step.waiting}` };
  log(settle, last.head);
  return settleLine(view.number, settle);
}

// Not ghClient: its call budget runs out mid-wait and it sets no timeout on gh.
function readView(runner: Runner, cwd: string, pr: number): Result<PrView> {
  const result = runner.run(["gh", "pr", "view", String(pr), "--json", PR_FIELDS], { cwd, timeoutMs: GH_TIMEOUT_MS });
  const view = toPrView(parseJson(result.stdout));
  return view ? { ok: true, value: view } : { ok: false, reason: firstLine(result.stderr) || "gh pr view gave no usable output" };
}

function treeHead(git: Git, view: PrView): string | undefined {
  const branch = git.out(["branch", "--show-current"]);
  if (!branch.ok || branch.value !== view.headRefName) return undefined;
  const head = git.out(["rev-parse", "HEAD"]);
  return head.ok ? head.value : undefined;
}

function lastPushOrRerun(events: readonly BabysitEvent[]): string | undefined {
  return events.findLast((event) => event.event === "pushed" || event.event === "rerun")?.at;
}

function withSince(since: string | undefined): Pick<WaitContext, "since"> {
  return since ? { since } : {};
}
