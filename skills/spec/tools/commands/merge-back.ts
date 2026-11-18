import { parseArgs } from "node:util";
import { gitAt } from "../core/git";
import { defaultBranch, systemRunner, type Runner } from "../core/run";
import { DEFAULT_PR_GROUP } from "../plan/docs/pr-doc";
import { loadSettings } from "../playbook/settings";
import { branchOf, laneOf } from "../pr/groups";
import { loadSpecLayout } from "../pr/load-layout";
import { mergeLane, pushLane, type LaneRef } from "../publish/merge-back";
import { laneMergeLines, lanePushLines } from "../publish/merge-back-render";
import { publishDocs } from "../publish/publish";
import { NO_DEFAULT_BRANCH } from "./push";

export const MERGE_BACK_USAGE = "merge-back <spec-name> [--push]";

export function mergeBackReport(projectDir: string, args: readonly string[], runner: Runner = systemRunner, now = new Date()): string {
  const request = parseRequest(args);
  if (typeof request === "string") return request;
  const lane = laneHere(projectDir, runner, request.spec, now);
  if (typeof lane === "string") return `merge-back: ${lane}`;
  const git = gitAt(projectDir, runner);
  const settings = loadSettings(projectDir);
  if (!request.push) return laneMergeLines(lane, mergeLane(git, lane), settings.gates).join("\n");
  const publish = settings.docs === "main" ? () => publishDocs(git, { defaultBranch: lane.defaultBranch, spec: lane.spec }) : undefined;
  return lanePushLines(lane, pushLane(git, lane, publish)).join("\n");
}

// The current branch must be a lane of the plan as the record holds it.
function laneHere(projectDir: string, runner: Runner, spec: string, now: Date): LaneRef | string {
  const main = defaultBranch(projectDir, runner);
  if (!main) return NO_DEFAULT_BRANCH;
  const layout = loadSpecLayout(projectDir, runner, spec, { fetch: loadSettings(projectDir).board.record, now });
  if (!layout || layout.mode !== "spec-branch") return `${spec} has no spec branch`;
  const head = gitAt(projectDir, runner).out(["symbolic-ref", "--short", "-q", "HEAD"]);
  const branch = head.ok ? head.value : "a detached HEAD";
  if (laneOf(layout, branch) === undefined) return `${branch} is not a lane of ${spec}; push your phase from your lane's tree`;
  return { spec, branch, specBranch: branchOf(layout, DEFAULT_PR_GROUP), defaultBranch: main };
}

function parseRequest(args: readonly string[]): { spec: string; push: boolean } | string {
  try {
    const { values, positionals } = parseArgs({ args: [...args], options: { push: { type: "boolean" } }, allowPositionals: true, strict: true });
    const [spec, ...extra] = positionals;
    return spec === undefined || extra.length > 0 ? `usage: ${MERGE_BACK_USAGE}` : { spec, push: values.push === true };
  } catch {
    return `usage: ${MERGE_BACK_USAGE}`;
  }
}
