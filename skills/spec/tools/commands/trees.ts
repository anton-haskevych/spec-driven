import { homedir } from "node:os";
import { gitAt, stateDir } from "../core/git";
import type { Result } from "../core/result";
import { placeTree, type PlaceDeps, type Placement } from "../trees/place";
import { applyPrune, findPrunable } from "../trees/prune";
import { backgroundPruneArgv, detachedSpawner, recordPruneRun, startBackgroundPrune, type Spawner } from "../trees/prune-background";
import { renderPruneApplied, renderPruneList, renderPruneSummaryLine } from "../trees/prune-render";
import { systemAsyncRunner, systemRunner } from "../core/run";
import { defaultClaudeHome } from "../sessions/live";

export const TREES_USAGE = "trees place <spec> <phase> [--json] | trees prune [--apply | --auto [--wait]]";

const JSON_FLAG = "--json";
const APPLY_FLAG = "--apply";
// Handoff's run, on Anton's standing yes (2026-10-30): applies without asking, in a detached process so nobody waits.
const AUTO_FLAG = "--auto";
// The detached process itself: does the work and records its one line for the next handoff.
const WAIT_FLAG = "--wait";
const PRUNE_FLAGS = new Set([APPLY_FLAG, AUTO_FLAG, WAIT_FLAG]);

export type TreesDeps = PlaceDeps & { spawner?: Spawner };

export function systemPlaceDeps(): PlaceDeps {
  return { runner: systemRunner, asyncRunner: systemAsyncRunner, claudeHome: defaultClaudeHome(), env: process.env, home: homedir() };
}

export async function treesCommand(projectDir: string, args: readonly string[], deps: TreesDeps = systemPlaceDeps()): Promise<string> {
  if (args[0] === "prune") return pruneCommand(projectDir, args.slice(1), deps);
  const json = args.includes(JSON_FLAG);
  const [action, spec, phase, ...extra] = args.filter((arg) => arg !== JSON_FLAG);
  if (action !== "place" || !spec || !phase || extra.length > 0) return `usage: ${TREES_USAGE}`;
  const placed = await placeTree(projectDir, spec, phase, deps);
  if (json) return JSON.stringify(placed.ok ? { placement: placed.value } : { placement: null, error: placed.reason }, null, 2);
  return renderPlacement(placed);
}

async function pruneCommand(projectDir: string, args: readonly string[], deps: TreesDeps): Promise<string> {
  if (args.some((arg) => !PRUNE_FLAGS.has(arg))) return `usage: ${TREES_USAGE}`;
  const auto = args.includes(AUTO_FLAG);
  const runDir = auto ? stateDir(gitAt(projectDir, deps.runner), "prune") : undefined;
  if (runDir && !runDir.ok) return `trees: ${runDir.reason}`;
  if (runDir && !args.includes(WAIT_FLAG)) return startBackgroundPrune(projectDir, runDir.value, deps.spawner ?? detachedSpawner, backgroundPruneArgv());
  const found = await findPrunable(projectDir, deps);
  if (!found.ok) {
    if (runDir) recordPruneRun(runDir.value, `trees: ${found.reason}`);
    return `trees: ${found.reason}`;
  }
  const report = found.value;
  if (!auto && !args.includes(APPLY_FLAG)) return renderPruneList(report);
  const outcomes = applyPrune(gitAt(projectDir, deps.runner), report.candidates);
  if (!runDir) return renderPruneApplied(outcomes, report);
  const line = renderPruneSummaryLine(outcomes, report);
  recordPruneRun(runDir.value, line);
  return line;
}

export function renderPlacement(placed: Result<Placement>): string {
  if (!placed.ok) return `trees: ${placed.reason}`;
  const placement = placed.value;
  if (placement.kind === "busy") return `trees: ${placement.path} is busy, ${placement.holder}; not placed`;
  const lines = placement.rootNotice ? [placement.rootNotice] : [];
  if (placement.kind === "found") return [...lines, `Tree: ${placement.path} · ${placement.branch} · existing`].join("\n");
  lines.push(`Tree: ${placement.path} · ${placement.branch} · ${HOW[placement.how]}${placement.offline ? ` (offline: ${placement.offline})` : ""}`);
  if (placement.setup.copied.length > 0) lines.push(`Copied: ${placement.setup.copied.join(", ")}`);
  if (placement.setup.failed) lines.push(`Setup failed: ${placement.setup.failed}. The tree is kept; fix it there.`);
  if (placement.bootstrap) lines.push(`Fresh tree: work through gate ${placement.bootstrap} (spec.ts gates --name ${placement.bootstrap}) before coding.`);
  return lines.join("\n");
}

const HOW: Record<Extract<Placement, { kind: "added" }>["how"], string> = {
  created: "new branch from origin",
  "took-over": "took over the branch from origin",
  "reused-branch": "new tree on the existing local branch",
};
