import { branchOnOrigin } from "../../claims/remote";
import { gitAt, type Git } from "../../core/git";
import { recordPortsOf } from "../../core/git-seams";
import { defaultBranch } from "../../core/run";
import { cutSpecBranch, existingSpecBranches, startPlan, type StartSeen } from "../../crew/spec-branch-start";
import { boardBase } from "../../plan/board-base";
import { DEFAULT_PR_GROUP, prBranch } from "../../plan/docs/pr-doc";
import { validateRecordDoc } from "../../plan/kinds";
import type { PhaseDeps } from "../../plan/phase-writer";
import { writeRecord, type StoreWrite } from "../../record/write";
import { stampedBy } from "../../sessions/facts";

export type SpecBranchStarter = (projectDir: string, spec: string, shipAlone: string[]) => Promise<{ ok: boolean; lines: string[] }>;

export const systemSpecBranchStarter = (deps: PhaseDeps): SpecBranchStarter => (projectDir, spec, shipAlone) => startSpecBranch(projectDir, deps, spec, shipAlone);

// For crew start --spec: `ok: false` means the run must not start.
export async function startSpecBranch(projectDir: string, deps: PhaseDeps, spec: string, shipAlone: string[]): Promise<{ ok: boolean; lines: string[] }> {
  const refused = (reason: string) => ({ ok: false, lines: [`crew start: ${reason}`] });
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return refused("no default branch (origin/HEAD is unset)");
  const git = gitAt(projectDir, deps.runner);
  const port = recordPortsOf(git, deps)?.port;
  if (!port) return refused("this repo has no origin; spec-branch mode needs the board's record");
  const base = await boardBase(git, branch, "spec-branch mode");
  if (!base.ok) return refused(base.reason);
  const existing = existingSpecBranches(git, spec);
  if (!existing.ok) return refused(existing.reason);
  let seen: StartSeen | undefined;
  const plan = startPlan({ spec, cutFrom: base.value.tip, shipAlone }, existing.value, (each) => (seen = each));
  const written = await writeRecord(port, stampedBy(git, deps.env, projectDir, deps.now())(plan), { validate: validateRecordDoc });
  if ((written.kind !== "landed" && written.kind !== "unchanged") || !seen) return refused(notWritten(written));
  return { ok: true, lines: [cutLine(git, spec, branch, seen)] };
}

function cutLine(git: Git, spec: string, branch: string, seen: StartSeen): string {
  const head = prBranch(spec, DEFAULT_PR_GROUP);
  if (seen.kind === "taken-over" && branchOnOrigin(git, head)) return `Spec branch: ${head} (spec-branch mode already on)`;
  const cut = cutSpecBranch(git, spec, seen.cutFrom);
  const from = `${branch} ${seen.cutFrom.slice(0, 7)}`;
  if (cut.kind === "offline") return `Spec branch: ${head} not cut from ${from} (${cut.reason}); spec-branch mode is on, run crew start --spec ${spec} again to cut it`;
  if (cut.kind === "refused") return `Spec branch: ${head} was cut by someone else first; check it holds ${from}`;
  return seen.kind === "taken-over" ? `Spec branch: ${head} was missing; cut again from ${from}` : `Spec branch: ${head} cut from ${from}`;
}

function notWritten(written: StoreWrite): string {
  switch (written.kind) {
    case "refused":
    case "failed":
      return written.reason;
    case "invalid":
      return written.problems.join("; ");
    case "conflict":
      return `${written.path} changed while it was written; run it again`;
    case "offline":
      return `Can't reach origin (${written.reason}); spec-branch mode is never queued, so run it again when origin answers.`;
    default:
      return "nothing written";
  }
}
