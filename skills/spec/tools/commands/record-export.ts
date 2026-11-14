import { join, relative } from "node:path";
import { applyEdits } from "../core/apply-edits";
import { readTextIfExists } from "../core/files";
import { gitAt, type Git } from "../core/git";
import { defaultBranch } from "../core/run";
import { resolveSpec } from "../core/spec-folders";
import { hasPhaseLines, planExport } from "../plan/export";
import { frozenProgress } from "../plan/frozen-progress";
import { readPlansWith } from "../plan/read-plans";
import type { JoinedPlan } from "../plan/state-source";
import { recordPortsOf } from "../core/git-seams";
import { writeRecord, type RecordPlan, type StoreWrite } from "../record/write";
import type { RecordDeps } from "./record";

export const EXPORT_USAGE = "record export <spec> [--unjoin]";

export async function recordExport(projectDir: string, spec: string, unjoin: boolean, deps: RecordDeps): Promise<string> {
  const folder = resolveSpec(projectDir, spec);
  if (typeof folder === "string") return `export: ${folder}`;
  const git = gitAt(projectDir, deps.runner);
  const plans = readPlansWith(git, deps, { fetch: true, now: deps.now() });
  const plan = plans.joined(spec);
  if (!plan) return `export: ${spec} is not on the board; its files already hold its plan`;
  const read = (pointer: string) => readTextIfExists(join(folder.dir, pointer));
  const phases = plan.phases.flatMap((doc) => {
    const text = read(doc.file);
    return text === undefined ? [] : [{ pointer: doc.file, text }];
  });
  const progress = read("progress.md") ?? "";
  const frozen = hasPhaseLines(progress) ? undefined : frozenAtDefault(projectDir, git, join(folder.dir, "progress.md"), deps);
  const exported = planExport(plan, { progress, phases }, unjoin, frozen);
  if (exported.missing.length > 0) return `export: refused, nothing written. ${exported.missing.join(", ")} not in this tree; export from a tree that has every phase file.`;
  applyEdits({ kind: "ok", edits: exported.files.map(({ pointer, text }) => ({ file: join(folder.dir, pointer), text })) });
  const written = `export: ${spec} written to files (${countsOf(plan)})`;
  if (!unjoin) return `${written}; still on the board`;
  const port = recordPortsOf(git, deps)?.port;
  if (!port) return `${written}; still on the board: this repo has no origin`;
  return `${written}${unjoinPart(await writeRecord(port, unjoinPlan(spec), { validate: deps.validate }))}`;
}

function frozenAtDefault(projectDir: string, git: Git, file: string, deps: RecordDeps): string | undefined {
  const branch = defaultBranch(projectDir, deps.runner);
  return branch ? frozenProgress(git, `origin/${branch}`, relative(projectDir, file)) : undefined;
}

function unjoinPlan(spec: string): RecordPlan {
  const prefix = `specs/${spec}/`;
  return (view) => {
    const paths = view.paths().filter((path) => path.startsWith(prefix));
    if (paths.length === 0) return { unchanged: true };
    return { ops: paths.map((path) => ({ op: "delete" as const, path })), message: `record: ${spec} off the board` };
  };
}

function unjoinPart(written: StoreWrite): string {
  if (written.kind === "landed" || written.kind === "unchanged") return "; off the board. Commit and publish these files: every tree reads them from now on";
  if (written.kind === "offline") return `; still on the board: can't reach origin (${written.reason}). Run it again when origin answers`;
  if (written.kind === "invalid") return `; still on the board: ${written.problems.join("; ")}`;
  if (written.kind === "conflict") return `; still on the board: ${written.path} changed meanwhile. Run it again`;
  return `; still on the board: ${written.reason}`;
}

function countsOf(plan: JoinedPlan): string {
  const tasks = plan.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  return `${plan.phases.length} phases, ${tasks} tasks`;
}
