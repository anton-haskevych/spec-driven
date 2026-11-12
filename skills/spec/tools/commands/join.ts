import { existsSync } from "node:fs";
import { join } from "node:path";
import { gitAt, type Git } from "../core/git";
import { defaultBranch, systemAsyncRunner, systemRunner, type AsyncRunner, type Runner } from "../core/run";
import type { Result } from "../core/result";
import { isoTimestamp } from "../core/schedule";
import { findSpecs } from "../core/spec-folders";
import { loadSpecStateFromFiles } from "../core/spec-state";
import { baseProject } from "../mainline/load";
import { isPlainObject } from "../record/document";
import { gitRecordPort, type RecordPort } from "../record/ref";
import { writeRecord, type RecordPlan, type StoreWrite } from "../record/write";
import { loadSettings, SETTINGS_FILE } from "../playbook/settings";
import { pinDefault } from "../publish/snapshot";
import { planJoin, type JoinCopy, type JoinPlan } from "../plan/join";
import { readTreeCopies } from "../plan/join-copies";
import { phaseDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { landBanner } from "../plan/land-banner";
import { NO_DEFAULT_BRANCH } from "./push";

export const JOIN_USAGE = "join <spec>";

export interface JoinDeps {
  runner: Runner;
  asyncRunner: AsyncRunner;
  now: () => Date;
}

interface Joining {
  git: Git;
  branch: string;
  port: RecordPort;
  spec: string;
}

export function systemJoinDeps(): JoinDeps {
  return { runner: systemRunner, asyncRunner: systemAsyncRunner, now: () => new Date() };
}

export async function joinCommand(projectDir: string, args: readonly string[], deps: JoinDeps = systemJoinDeps()): Promise<string> {
  const [spec, ...extra] = args;
  if (spec === undefined || extra.length > 0) return `usage: ${JOIN_USAGE}`;
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return `join: ${NO_DEFAULT_BRANCH.replace("nothing pushed", "nothing written")}`;
  const git = gitAt(projectDir, deps.runner);
  const port = gitRecordPort(git);
  if (!port) return "join: this repo has no origin; the board's record lives there";
  const joining = { git, branch, port, spec };
  const copies = await readCopies(joining, deps);
  if (!copies.ok) return `join: refused, nothing written. ${copies.reason}`;
  const planned = planJoin({ spec, ...copies.value, joinedAt: isoTimestamp(deps.now()) });
  if ("refused" in planned) return `join: refused, nothing written. ${planned.refused}`;
  let existing: unknown;
  const written = await writeRecord(port, joinPlan(planned, (doc) => (existing = doc)), { validate: validateRecordDoc });
  const lines = [...planned.recorded, ...planned.left].map((line) => `join: ${line}`);
  return [...lines, await resultLine(joining, planned, written, existing, copies.value.trees.length)].join("\n");
}

// The setting and the spec come from the default branch, so a tree cut before the switch agrees.
async function readCopies(joining: Joining, deps: JoinDeps): Promise<Result<{ base: JoinCopy; trees: JoinCopy[]; onBase(pointer: string): boolean }>> {
  const { git, branch, spec } = joining;
  const tip = pinDefault(git, branch);
  if (!tip.ok) return { ok: false, reason: `Can't reach origin (${tip.reason}); a join is never queued, so run it again when origin answers.` };
  const project = await baseProject(git, tip.value);
  if (!project.ok) return project;
  const settings = loadSettings(project.value.dir);
  if (!settings.board.record) return { ok: false, reason: `The board is off here: ${SETTINGS_FILE} on ${branch} doesn't say board.record: on.` };
  if (settings.docs !== "main") return { ok: false, reason: "The board needs docs: main in this version." };
  const folders = findSpecs(project.value.dir, spec);
  const [folder] = folders;
  if (!folder) return { ok: false, reason: `No spec named ${spec} on origin/${branch}; land the spec first.` };
  if (folders.length > 1) return { ok: false, reason: `${folders.length} specs are named ${spec} on origin/${branch}.` };
  const state = loadSpecStateFromFiles(folder);
  if (!state.hasProgress) return { ok: false, reason: `${spec} is still in prep; it has no phases to put on the board.` };
  const trees = await readTreeCopies(git, deps.asyncRunner, tip.value, spec);
  if (!trees.ok) return trees;
  return { ok: true, value: { base: { tree: branch, head: tip.value, state }, trees: trees.value, onBase: (pointer) => existsSync(join(folder.dir, pointer)) } };
}

// `spec.json` is a create: of two machines joining at once, the second finds it and changes nothing.
function joinPlan(planned: JoinPlan, seen: (doc: unknown) => void): RecordPlan {
  const { spec, phases } = planned;
  return (view) => {
    const current = view.doc(specDocPath(spec.name));
    seen(current);
    if (current !== undefined) return { unchanged: true };
    return {
      ops: [{ op: "create", path: specDocPath(spec.name), doc: spec }, ...phases.map((phase) => ({ op: "create" as const, path: phaseDocPath(spec.name, phase.id), doc: phase }))],
      message: `record: join ${spec.name}`,
    };
  };
}

async function resultLine(joining: Joining, planned: JoinPlan, written: StoreWrite, existing: unknown, treesRead: number): Promise<string> {
  const { spec } = joining;
  if (written.kind === "landed") {
    const tasks = planned.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
    const counts = `${planned.phases.length} phases, ${tasks} tasks, ${treesRead} ${treesRead === 1 ? "worktree" : "worktrees"} read`;
    return `join: ${spec} is on the board (${counts})${await bannerPart(joining, planned.spec.joinedAt)}`;
  }
  if (written.kind === "unchanged" || (written.kind === "conflict" && written.path === specDocPath(spec))) {
    const current = written.kind === "conflict" ? written.current : existing;
    const joinedAt = isPlainObject(current) && typeof current.joinedAt === "string" ? current.joinedAt : planned.spec.joinedAt;
    return `join: ${spec} is already on the board${await bannerPart(joining, joinedAt)}`;
  }
  if (written.kind === "offline") return `join: refused, nothing written. Can't reach origin (${written.reason}); a join is never queued.`;
  if (written.kind === "invalid") return `join: refused, nothing written. ${written.problems.join("; ")}`;
  if (written.kind === "conflict") return `join: refused, nothing written. ${written.path} is already on the record.`;
  return `join: refused, nothing written. ${written.reason}`;
}

async function bannerPart(joining: Joining, joinedAt: string): Promise<string> {
  const landed = await landBanner(joining.git, joining.branch, joining.spec, joinedAt.slice(0, 10));
  if (landed.kind === "landed") return ` · banner landed on ${joining.branch} (${landed.sha.slice(0, 7)})`;
  if (landed.kind === "unchanged") return "";
  return ` · banner not on ${joining.branch} yet (${landed.reason}); run join again to land it`;
}
