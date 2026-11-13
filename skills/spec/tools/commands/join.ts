import { existsSync } from "node:fs";
import type { Env } from "../core/env";
import { join } from "node:path";
import { gitAt, type Git } from "../core/git";
import { defaultBranch, systemAsyncRunner, systemRunner, type AsyncRunner, type Runner } from "../core/run";
import type { Result } from "../core/result";
import { isoTimestamp } from "../core/schedule";
import { findSpecs } from "../core/spec-folders";
import { loadSpecStateFromFiles } from "../core/spec-state";
import { isPlainObject } from "../record/document";
import { gitRecordPort, type RecordPort } from "../record/ref";
import { writeRecord, type RecordPlan, type StoreWrite } from "../record/write";
import { boardBase } from "../plan/board-base";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import type { SpecDoc } from "../plan/docs/spec-doc";
import { planJoin, type JoinInput, type JoinPlan } from "../plan/join";
import type { QuestionDoc } from "../questions/question-doc";
import { specCard, type SpecCardSeed } from "../cards/spec-card";
import { copyFromFolder } from "../plan/upgrade-read";
import { ghClient, type GhClient } from "../pr/gh";
import { readTreeCopies } from "../plan/join-copies";
import { missingPrDocs, type PrDoc } from "../plan/docs/pr-doc";
import { phaseDocPath, prDocPath, questionDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { landBanner } from "../plan/land-banner";
import { joinFromTree } from "./join-from-tree";
import { joinTidy } from "./join-tidy";
import { NO_DEFAULT_BRANCH } from "./push";

export const JOIN_USAGE = "join <spec> [--from-tree | --tidy]";
const FROM_TREE = "--from-tree";
const TIDY = "--tidy";

export interface JoinDeps {
  runner: Runner;
  asyncRunner: AsyncRunner;
  now: () => Date;
  env?: Env;
}

interface Joining {
  git: Git;
  branch: string;
  port: RecordPort;
  spec: string;
  gh: GhClient;
}

export function systemJoinDeps(): JoinDeps {
  return { runner: systemRunner, asyncRunner: systemAsyncRunner, now: () => new Date(), env: process.env };
}

export async function joinCommand(projectDir: string, args: readonly string[], deps: JoinDeps = systemJoinDeps()): Promise<string> {
  const [spec, ...extra] = args;
  if (spec !== undefined && extra.length === 1 && extra[0] === FROM_TREE) return joinFromTree(projectDir, spec, deps);
  if (spec !== undefined && extra.length === 1 && extra[0] === TIDY) return joinTidy(projectDir, spec, deps);
  if (spec === undefined || extra.length > 0) return `usage: ${JOIN_USAGE}`;
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return `join: ${NO_DEFAULT_BRANCH.replace("nothing pushed", "nothing written")}`;
  const git = gitAt(projectDir, deps.runner);
  const port = gitRecordPort(git);
  if (!port) return "join: this repo has no origin; the board's record lives there";
  const joining = { git, branch, port, spec, gh: ghClient(projectDir, deps.runner) };
  const copies = await readCopies(joining, deps);
  if (!copies.ok) return `join: refused, nothing written. ${copies.reason}`;
  const planned = planJoin({ spec, ...copies.value, joinedAt: isoTimestamp(deps.now()) });
  if ("refused" in planned) return `join: refused, nothing written. ${planned.refused}`;
  let existing: unknown;
  const written = await writeRecord(port, newSpecPlan(planned, "join", (doc) => (existing = doc)), { validate: validateRecordDoc });
  const lines = [...planned.recorded, ...planned.left].map((line) => `join: ${line}`);
  return [...lines, await resultLine(joining, planned, written, existing, copies.value.trees.length)].join("\n");
}

type Copies = Pick<JoinInput, "base" | "trees" | "onBase" | "copy">;

async function readCopies(joining: Joining, deps: JoinDeps): Promise<Result<Copies>> {
  const { git, branch, spec } = joining;
  const base = await boardBase(git, branch, "a join");
  if (!base.ok) return base;
  const { tip, projectDir } = base.value;
  const folders = findSpecs(projectDir, spec);
  const [folder] = folders;
  if (!folder) return { ok: false, reason: `No spec named ${spec} on origin/${branch}; land the spec first.` };
  if (folders.length > 1) return { ok: false, reason: `${folders.length} specs are named ${spec} on origin/${branch}.` };
  const state = loadSpecStateFromFiles(folder);
  if (!state.hasProgress) return { ok: false, reason: `${spec} is still in prep; it has no phases to put on the board.` };
  const trees = await readTreeCopies(git, deps.asyncRunner, tip, spec);
  if (!trees.ok) return trees;
  const { gh } = joining;
  return {
    ok: true,
    value: {
      base: { tree: branch, head: tip, state },
      trees: trees.value,
      onBase: (pointer) => existsSync(join(folder.dir, pointer)),
      copy: (phases) => copyFromFolder(folder.dir, spec, phases, gh),
    },
  };
}

export interface NewSpec {
  spec: SpecDoc;
  phases: readonly PhaseDoc[];
  prs?: readonly PrDoc[];
  questions?: readonly QuestionDoc[];
  card?: SpecCardSeed;
}

// `spec.json` is a create: of two machines writing a spec at once, the second finds it and changes nothing.
// The spec's card lands in the same batch when no card covers it, so a spec on layout 4 always has one.
export function newSpecPlan({ spec, phases, prs, questions, card }: NewSpec, verb: string, seen: (doc: unknown) => void): RecordPlan {
  return (view) => {
    const current = view.doc(specDocPath(spec.name));
    seen(current);
    if (current !== undefined) return { unchanged: true };
    return {
      ops: [
        { op: "create", path: specDocPath(spec.name), doc: spec },
        ...phases.map((phase) => ({ op: "create" as const, path: phaseDocPath(spec.name, phase.id), doc: phase })),
        ...(prs ?? missingPrDocs(spec.name, phases, () => false)).map((doc) => ({ op: "create" as const, path: prDocPath(spec.name, doc.group), doc })),
        ...(questions ?? []).map((doc) => ({ op: "create" as const, path: questionDocPath(spec.name, doc.id), doc })),
        ...(card ? (specCard(view, spec.name, card, spec.joinedAt)?.ops ?? []) : []),
      ],
      message: `record: ${verb} ${spec.name}`,
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
