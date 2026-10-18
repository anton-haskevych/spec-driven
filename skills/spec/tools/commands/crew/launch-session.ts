import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { prClaimId } from "../../claims/pr-claim";
import { parseFrontmatter } from "../../core/frontmatter";
import { readTextIfExists } from "../../core/files";
import { normalizePhaseHint } from "../../context/request";
import { isoTimestamp } from "../../core/schedule";
import { findSpecs } from "../../core/spec-folders";
import { readShipField } from "../../core/spec-meta";
import { launchedLine, launchInBackground } from "../../launch/background";
import { sessionLaunch } from "../../launch/command-line";
import { freshTreeNotes, placeForLaunch, type PlaceFn } from "../../launch/place-for-launch";
import { renderPlacement } from "../trees";
import { renderBrief, type BriefRequest } from "../../crew/brief";
import { loadSettings } from "../../playbook/settings";
import type { CrewDeps, RunFileStore } from "../../crew/deps";
import { parseRunFile, withLaunched, withLog, type LaunchedEntry } from "../../crew/run-state";

export interface CrewLaunchRequest {
  subCommand: "execute" | "babysit";
  spec: string;
  target: string;
  hold: boolean;
  notes: readonly string[];
}

export interface CrewLaunchResult {
  text: string;
  launched?: LaunchedEntry;
}

// Brief, placement, `claude --bg` and the `## Launched` entry in one step, so the overseer never
// hand-writes a brief or edits run.md.
export async function launchCrewSession(request: CrewLaunchRequest, store: RunFileStore, deps: CrewDeps, place: PlaceFn): Promise<CrewLaunchResult> {
  const runText = store.read();
  if (runText === undefined) return { text: "crew launch: no run.md yet; run crew start first" };
  const run = parseRunFile(runText);
  if (run.runner === undefined) return { text: "crew launch: can't tell who runs this crew; run crew start again" };
  const overseer = run.overseer ?? "unknown";
  const positionals = [request.subCommand, request.spec, request.target, ...(request.hold ? ["hold"] : [])];
  const valid = sessionLaunch(".", positionals);
  if (!valid.ok) return { text: `crew launch: ${valid.reason}` };

  const placed = await placeForLaunch({ subCommand: request.subCommand, spec: request.spec, target: request.target, onlyFor: run.runner }, place);
  if (!placed.ok) return { text: `launch: ${placed.reason}` };
  const placement = renderPlacement(placed);
  const tree = placed.value.path;
  const inTree = sessionLaunch(tree, positionals);
  if (!inTree.ok) return { text: `crew launch: ${inTree.reason}` };

  const target = request.subCommand === "babysit" ? { group: request.target } : { phase: normalizePhaseHint(request.target) };
  const ship: BriefRequest["ship"] = request.hold ? { mode: "hold-for-review", from: "spec" } : shipOf(tree, request.spec);
  const brief = briefPath(store.path, request);
  mkdirSync(dirname(brief), { recursive: true });
  writeFileSync(brief, renderBrief({ overseer, spec: request.spec, target, tree, ...(ship ? { ship } : {}), notes: [...request.notes, ...freshTreeNotes(placement)] }));

  const session = launchInBackground(inTree.value, brief, [], deps.runner);
  const text = [placement, launchedLine(session, inTree.value.title)].join("\n");
  if (!session.ok) return { text };
  const at = isoTimestamp(deps.now());
  const launched = { id: session.value.id, title: inTree.value.title, at };
  const current = store.read() ?? runText;
  store.write(withLog(withLaunched(current, [...parseRunFile(current).launched, launched]), [`${at} launched ${launched.id} · ${launched.title}`]));
  return { text, launched };
}

function briefPath(runPath: string, request: CrewLaunchRequest): string {
  const target = request.subCommand === "babysit" ? prClaimId(request.target) : normalizePhaseHint(request.target);
  return join(dirname(runPath), "briefs", `${request.spec}#${target}.md`);
}

// The placed tree's copy: a fresh tree is cut from origin's default branch, where `spec.ts ship` lands.
// The spec's ship: wins; settings pr.ship is the project's default.
function shipOf(tree: string, spec: string): BriefRequest["ship"] {
  if (!existsSync(tree)) return undefined;
  const [folder] = findSpecs(tree, spec);
  const meta = folder ? parseFrontmatter(readTextIfExists(join(folder.dir, "CLAUDE.md")) ?? "") : undefined;
  const own = meta?.kind === "ok" ? readShipField(meta.data).ship : undefined;
  if (own) return { mode: own, from: "spec" };
  const fallback = loadSettings(tree).pr.ship;
  return fallback ? { mode: fallback, from: "settings" } : undefined;
}
