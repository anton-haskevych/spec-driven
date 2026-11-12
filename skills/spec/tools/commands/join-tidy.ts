import { join, relative } from "node:path";
import { readTextIfExists } from "../core/files";
import { gitAt, type Git } from "../core/git";
import { landOnMain, type MainEditPlan } from "../core/land-on-main";
import { defaultBranch } from "../core/run";
import { isoTimestamp } from "../core/schedule";
import { findSpecs } from "../core/spec-folders";
import { baseProject } from "../mainline/load";
import { pinDefault } from "../publish/snapshot";
import { readPlans } from "../plan/read-plans";
import { planTidy, type TidiedFile } from "../plan/tidy";
import { tidyHolders, type TidyHolders } from "../plan/tidy-holders";
import type { JoinDeps } from "./join";
import { NO_DEFAULT_BRANCH } from "./push";

interface Tidying {
  spec: string;
  branch: string;
  day: string;
  pointers: readonly string[];
  holders: TidyHolders;
}

interface Tidied {
  files: string[];
  held: string[];
}

export async function joinTidy(projectDir: string, spec: string, deps: JoinDeps): Promise<string> {
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return `join: ${NO_DEFAULT_BRANCH.replace("nothing pushed", "nothing written")}`;
  const git = gitAt(projectDir, deps.runner);
  const plan = readPlans(git, { fetch: true, now: deps.now() }).joined(spec);
  if (!plan) return `join: refused, nothing written. ${spec} is not on the board; only a joined spec is tidied.`;
  const tip = pinDefault(git, branch);
  if (!tip.ok) return `join: refused, nothing written. Can't reach origin (${tip.reason}).`;
  const specDir = await specDirAt(git, tip.value, spec);
  if (!specDir.ok) return `join: refused, nothing written. ${specDir.reason}`;
  const holders = await tidyHolders(git, deps.asyncRunner, tip.value, spec, specDir.value);
  if (!holders.ok) return `join: refused, nothing written. ${holders.reason}.`;
  const tidying: Tidying = { spec, branch, day: isoTimestamp(deps.now()).slice(0, 10), pointers: plan.phases.map((phase) => phase.file), holders: inSpec(holders.value, specDir.value) };
  const landing = await landOnMain(git, branch, (dir) => tidyEdit(dir, tidying));
  if (landing.kind === "landed") return `join: tidied ${spec} on ${branch} (${landing.sha.slice(0, 7)}): ${countOf(landing.landed.files.length, "file")}${heldPart(landing.landed.held, tidying)}`;
  if (landing.kind === "unchanged") return `join: ${landing.reason}`;
  return `join: refused, nothing written. ${landing.reason}`;
}

async function specDirAt(git: Git, sha: string, spec: string) {
  const project = await baseProject(git, sha);
  if (!project.ok) return project;
  const [folder] = findSpecs(project.value.dir, spec);
  if (!folder) return { ok: false as const, reason: `${spec} is not on origin at ${sha.slice(0, 7)}.` };
  return { ok: true as const, value: relative(project.value.root, folder.dir) };
}

function inSpec(holders: TidyHolders, specDir: string): TidyHolders {
  return new Map([...holders].map(([path, names]) => [relative(specDir, path), names]));
}

function tidyEdit(projectDir: string, tidying: Tidying): MainEditPlan<Tidied> {
  const [folder] = findSpecs(projectDir, tidying.spec);
  if (!folder) return { kind: "refused", reason: `${tidying.spec} is not on ${tidying.branch}.` };
  const read = (pointer: string) => readTextIfExists(join(folder.dir, pointer));
  const phases = tidying.pointers.flatMap((pointer) => {
    const text = read(pointer);
    return text === undefined ? [] : [{ pointer, text }];
  });
  const planned = planTidy(tidying.spec, tidying.day, { progress: read("progress.md") ?? "", phases });
  const free = planned.filter((file) => !tidying.holders.has(file.pointer));
  const held = planned.filter((file) => tidying.holders.has(file.pointer)).map((file) => file.pointer);
  if (free.length === 0) return { kind: "unchanged", reason: planned.length === 0 ? `${tidying.spec} is already tidy` : `nothing tidied${heldPart(held, tidying)}` };
  return { kind: "write", files: free.map((file: TidiedFile) => ({ file: join(folder.dir, file.pointer), text: file.text })), message: `[board] ${tidying.spec}: the plan lives on the board`, landed: { files: free.map((file) => file.pointer), held } };
}

function heldPart(held: readonly string[], tidying: Tidying): string {
  if (held.length === 0) return "";
  return ` · left ${held.map((pointer) => `${pointer} (${tidying.holders.get(pointer)?.join(", ")})`).join(", ")}: run join ${tidying.spec} --tidy again once that work has merged`;
}

function countOf(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}
