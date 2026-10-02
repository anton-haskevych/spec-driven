import { homedir } from "node:os";
import { gitAt } from "../core/git";
import type { Result } from "../core/result";
import { placeTree, type PlaceDeps, type Placement } from "../trees/place";
import { applyPrune, findPrunable } from "../trees/prune";
import { systemAsyncRunner, systemRunner } from "../core/run";
import { defaultClaudeHome } from "../sessions/live";

export const TREES_USAGE = "trees place <spec> <phase> [--json] | trees prune [--apply]";

const JSON_FLAG = "--json";
const APPLY_FLAG = "--apply";

export function systemPlaceDeps(): PlaceDeps {
  return { runner: systemRunner, asyncRunner: systemAsyncRunner, claudeHome: defaultClaudeHome(), env: process.env, home: homedir() };
}

export async function treesCommand(projectDir: string, args: readonly string[], deps: PlaceDeps = systemPlaceDeps()): Promise<string> {
  if (args[0] === "prune") return pruneCommand(projectDir, args.slice(1), deps);
  const json = args.includes(JSON_FLAG);
  const [action, spec, phase, ...extra] = args.filter((arg) => arg !== JSON_FLAG);
  if (action !== "place" || !spec || !phase || extra.length > 0) return `usage: ${TREES_USAGE}`;
  const placed = await placeTree(projectDir, spec, phase, deps);
  if (json) return JSON.stringify(placed.ok ? { placement: placed.value } : { placement: null, error: placed.reason }, null, 2);
  return renderPlacement(placed);
}

async function pruneCommand(projectDir: string, args: readonly string[], deps: PlaceDeps): Promise<string> {
  const apply = args.includes(APPLY_FLAG);
  if (args.some((arg) => arg !== APPLY_FLAG)) return `usage: ${TREES_USAGE}`;
  const found = await findPrunable(projectDir, deps);
  if (!found.ok) return `trees: ${found.reason}`;
  const { candidates, prsUnchecked } = found.value;
  const unchecked = prsUnchecked ? [`PR merges not checked (${prsUnchecked}); only trees already in base are listed.`] : [];
  if (candidates.length === 0) return ["trees: nothing to prune", ...unchecked].join("\n");
  if (apply) return [...applyPrune(gitAt(projectDir, deps.runner), candidates), ...unchecked].join("\n");
  const rows = candidates.map(({ path, branch, evidence }) => `  ${[path, branch, evidence].filter(Boolean).join(" · ")}`);
  return [`prune ${candidates.length} merged ${candidates.length === 1 ? "tree" : "trees"} (idle, nothing unpushed; trees with edits are kept):`, ...rows, ...unchecked].join("\n");
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
