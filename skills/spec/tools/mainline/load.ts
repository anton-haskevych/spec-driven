import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadBacklog, type BacklogItem } from "../backlog/items";
import type { Git } from "../core/git";
import type { Result } from "../core/result";
import { listSpecs, type SpecFolder } from "../core/spec-folders";
import { loadSpecState, type SpecState } from "../core/spec-state";
import { loadNodes, type SpecNode } from "../graph/nodes";
import { loadSettings, type ProjectSettings } from "../playbook/settings";
import { originTip, pinDefault } from "../publish/snapshot";
import { baseCache } from "./base-cache";

export interface MainlineOptions {
  timeoutMs: number;
  local: boolean;
}

export interface BaseRef {
  branch: string;
  sha: string;
  date: string;
  fetch: Result<void> | "local";
}

export type SpecStage = "prep" | "create";

export interface Mainline {
  base: BaseRef;
  nodes: Map<string, SpecNode>;
  states: Map<string, SpecState>;
  stages: Map<string, SpecStage>;
  backlog: BacklogItem[];
  settings: ProjectSettings;
  duplicates: string[];
}

export async function loadMainline(git: Git, branch: string, options: MainlineOptions): Promise<Result<Mainline>> {
  const pinned = pinBase(git, branch, options);
  if (!pinned.ok) return pinned;
  const { sha, fetch } = pinned.value;
  const facts = repoFacts(git, sha);
  if (!facts.ok) return facts;
  const { date, commonDir, prefix } = facts.value;

  const cache = await baseCache(git, sha, commonDir);
  if (!cache.ok) return cache;
  return { ok: true, value: { base: { branch, sha, date, fetch }, ...loadSpecDocs(join(cache.value, prefix)) } };
}

function repoFacts(git: Git, sha: string): Result<{ date: string; commonDir: string; prefix: string }> {
  const date = git.out(["log", "-1", "--format=%cI", sha]);
  if (!date.ok) return date;
  const commonDir = git.out(["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  if (!commonDir.ok) return commonDir;
  const prefix = git.out(["rev-parse", "--show-prefix"]);
  if (!prefix.ok) return prefix;
  return { ok: true, value: { date: date.value, commonDir: commonDir.value, prefix: prefix.value } };
}

function pinBase(git: Git, branch: string, options: MainlineOptions): Result<{ sha: string; fetch: BaseRef["fetch"] }> {
  const pinned = options.local ? undefined : pinDefault(git, branch, { timeoutMs: options.timeoutMs });
  if (pinned?.ok) return { ok: true, value: { sha: pinned.value, fetch: { ok: true, value: undefined } } };
  const local = originTip(git, branch);
  if (!local.ok || !local.value) return { ok: false, reason: `no origin/${branch} ref` };
  return { ok: true, value: { sha: local.value, fetch: pinned ?? "local" } };
}

function loadSpecDocs(projectDir: string): Omit<Mainline, "base"> {
  const specs = listSpecs(projectDir);
  const states = new Map<string, SpecState>();
  for (const spec of specs) if (!states.has(spec.name)) states.set(spec.name, loadSpecState(spec));
  const stages = new Map<string, SpecStage>();
  for (const [name, state] of states) if (!state.hasProgress) stages.set(name, stageOf(state.spec));
  return {
    nodes: loadNodes(projectDir),
    states,
    stages,
    backlog: loadBacklog(projectDir),
    settings: loadSettings(projectDir),
    duplicates: duplicateNames(specs),
  };
}

function stageOf(spec: SpecFolder): SpecStage {
  const hasBrief = existsSync(join(spec.dir, "product-brief.md"));
  return hasBrief && !existsSync(join(spec.dir, "seed.md")) ? "create" : "prep";
}

function duplicateNames(specs: readonly SpecFolder[]): string[] {
  const names = specs.map((spec) => spec.name);
  return [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
}
