import { homedir } from "node:os";
import type { Result } from "../core/result";
import { placeTree, type PlaceDeps, type Placement } from "../trees/place";
import { systemAsyncRunner, systemRunner } from "../core/run";
import { defaultClaudeHome } from "../sessions/live";

export const TREES_USAGE = "trees place <spec> <phase> [--json]";

const JSON_FLAG = "--json";

export function systemPlaceDeps(): PlaceDeps {
  return { runner: systemRunner, asyncRunner: systemAsyncRunner, claudeHome: defaultClaudeHome(), env: process.env, home: homedir() };
}

export async function treesCommand(projectDir: string, args: readonly string[], deps: PlaceDeps = systemPlaceDeps()): Promise<string> {
  const json = args.includes(JSON_FLAG);
  const [action, spec, phase, ...extra] = args.filter((arg) => arg !== JSON_FLAG);
  if (action !== "place" || !spec || !phase || extra.length > 0) return `usage: ${TREES_USAGE}`;
  const placed = await placeTree(projectDir, spec, phase, deps);
  if (json) return JSON.stringify(placed.ok ? { placement: placed.value } : { placement: null, error: placed.reason }, null, 2);
  return renderPlacement(placed);
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
