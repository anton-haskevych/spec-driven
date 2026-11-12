import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { gitAt } from "../core/git";
import { defaultBranch } from "../core/run";
import { isoTimestamp } from "../core/schedule";
import { resolveSpec, type SpecFolder } from "../core/spec-folders";
import { planApply } from "../plan/apply";
import { progressStub } from "../plan/banner";
import { boardBase } from "../plan/board-base";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import { validateRecordDoc } from "../plan/kinds";
import { gitRecordPort } from "../record/ref";
import { writeRecord, type StoreWrite } from "../record/write";
import { newSpecPlan, systemJoinDeps, type JoinDeps } from "./join";
import { NO_DEFAULT_BRANCH } from "./push";

export const PLAN_USAGE = "plan apply <spec> --file <draft.json>";

const refused = (reason: string) => `plan: refused, nothing written. ${reason}`;

export async function planCommand(projectDir: string, args: readonly string[], deps: JoinDeps = systemJoinDeps()): Promise<string> {
  const [action, spec, flag, file, ...extra] = args;
  if (action !== "apply" || spec === undefined || flag !== "--file" || file === undefined || extra.length > 0) return `usage: ${PLAN_USAGE}`;
  const folder = resolveSpec(projectDir, spec);
  if (typeof folder === "string") return `plan: ${folder}`;
  if (existsSync(join(folder.dir, "progress.md"))) return refused(`${spec} already has progress.md: a spec on files goes on the board with join ${spec}.`);
  const draft = readDraft(isAbsolute(file) ? file : join(projectDir, file));
  if (!draft.ok) return refused(draft.reason);
  return applyDraft(projectDir, folder, draft.value, deps);
}

async function applyDraft(projectDir: string, folder: SpecFolder, draft: unknown, deps: JoinDeps): Promise<string> {
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return refused(NO_DEFAULT_BRANCH.replace("nothing pushed", "nothing written"));
  const git = gitAt(projectDir, deps.runner);
  const port = gitRecordPort(git);
  if (!port) return refused("This repo has no origin; the board's record lives there.");
  const base = await boardBase(git, branch, "a new plan");
  if (!base.ok) return refused(base.reason);
  const head = git.out(["rev-parse", "HEAD"]);
  if (!head.ok) return refused(head.reason);
  const now = deps.now();
  const planned = planApply(folder.name, draft, { joinedAt: isoTimestamp(now), joinedFrom: head.value });
  if ("problems" in planned) return refused(`The draft has problems: ${planned.problems.join("; ")}.`);
  const missing = planned.phases.filter((phase) => !existsSync(join(folder.dir, phase.file))).map((phase) => phase.file);
  if (missing.length > 0) return refused(`Write the phase files first: ${missing.join(", ")}.`);
  const written = await writeRecord(port, newSpecPlan(planned, "plan", () => {}), { validate: validateRecordDoc });
  if (written.kind !== "landed") return writtenRefusal(folder.name, written);
  writeFileSync(join(folder.dir, "progress.md"), progressStub("", folder.name, isoTimestamp(now).slice(0, 10)));
  return `plan: ${folder.name} is on the board (${countsOf(planned.phases)}) · progress.md written`;
}

function readDraft(path: string): { ok: true; value: unknown } | { ok: false; reason: string } {
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, "utf8")) };
  } catch (cause) {
    return { ok: false, reason: `Can't read the draft ${path}: ${cause instanceof Error ? cause.message : String(cause)}.` };
  }
}

function writtenRefusal(spec: string, written: Exclude<StoreWrite, { kind: "landed" }>): string {
  if (written.kind === "unchanged") return refused(`${spec} is already on the board; change its plan with phase add / split / move / set.`);
  if (written.kind === "offline") return refused(`Can't reach origin (${written.reason}); a new plan is never queued.`);
  if (written.kind === "invalid") return refused(written.problems.join("; "));
  if (written.kind === "conflict") return refused(`${written.path} is already on the record.`);
  return refused(written.reason);
}

function countsOf(phases: readonly PhaseDoc[]): string {
  const tasks = phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  return `${phases.length} ${phases.length === 1 ? "phase" : "phases"}, ${tasks} ${tasks === 1 ? "task" : "tasks"}`;
}
