import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadBacklog, type BacklogItem } from "../backlog/items";
import type { BaseRef, SpecStage } from "../board/inputs";
import { gitCommonDir, type Git } from "../core/git";
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

export interface Mainline {
  base: BaseRef;
  commonDir: string;
  nodes: Map<string, SpecNode>;
  states: Map<string, SpecState>;
  stages: Map<string, SpecStage>;
  backlog: BacklogItem[];
  settings: ProjectSettings;
  duplicates: string[];
}

export interface BaseProject {
  commonDir: string;
  root: string;
  dir: string;
}

export async function loadMainline(git: Git, branch: string, options: MainlineOptions): Promise<Result<Mainline>> {
  const pinned = pinBase(git, branch, options);
  if (!pinned.ok) return pinned;
  const { sha, fetch } = pinned.value;
  const date = git.out(["log", "-1", "--format=%cI", sha]);
  if (!date.ok) return date;
  const project = await baseProject(git, sha);
  if (!project.ok) return project;
  const { commonDir, dir } = project.value;
  return { ok: true, value: { base: { branch, sha, date: date.value, fetch }, commonDir, ...loadSpecDocs(dir) } };
}

// The spec docs at `sha`, extracted to the shared cache: `root` is the repo root there, `dir` this project.
export async function baseProject(git: Git, sha: string): Promise<Result<BaseProject>> {
  const commonDir = gitCommonDir(git);
  if (!commonDir.ok) return commonDir;
  const prefix = git.out(["rev-parse", "--show-prefix"]);
  if (!prefix.ok) return prefix;
  const cache = await baseCache(git, sha, commonDir.value);
  if (!cache.ok) return cache;
  return { ok: true, value: { commonDir: commonDir.value, root: cache.value, dir: join(cache.value, prefix.value) } };
}

function pinBase(git: Git, branch: string, options: MainlineOptions): Result<{ sha: string; fetch: BaseRef["fetch"] }> {
  const pinned = options.local ? undefined : pinDefault(git, branch, { timeoutMs: options.timeoutMs });
  if (pinned?.ok) return { ok: true, value: { sha: pinned.value, fetch: { ok: true, value: undefined } } };
  const local = originTip(git, branch);
  if (!local.ok || !local.value) return { ok: false, reason: `no origin/${branch} ref` };
  return { ok: true, value: { sha: local.value, fetch: pinned ?? "local" } };
}

function loadSpecDocs(projectDir: string): Omit<Mainline, "base" | "commonDir"> {
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
