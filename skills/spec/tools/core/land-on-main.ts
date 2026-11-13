import { relative } from "node:path";
import { baseProject } from "../mainline/load";
import { commitOnto } from "../publish/commit-onto";
import { NON_FAST_FORWARD } from "../publish/publish";
import { pinDefault } from "../publish/snapshot";
import type { FileEdit } from "./apply-edits";
import { gitFailureReason, type Git } from "./git";
import type { Result } from "./result";

// `plan` gets this project's folder at the freshly fetched tip, not the checkout. A write names one file,
// or several that land in one commit.
export type MainEditPlan<T> =
  | ({ kind: "write"; message: string; landed: T } & (FileEdit | { files: readonly FileEdit[] }))
  | { kind: "unchanged" | "refused"; reason: string };

// `refused`: the edit itself can't apply; `unchanged`: the tip already says it; `failed`: git or origin said no.
export type MainLanding<T> =
  | { kind: "landed"; sha: string; landed: T }
  | { kind: "unchanged" | "refused" | "failed"; reason: string };

type Attempt<T> = MainLanding<T> | { kind: "retry" };

const ATTEMPTS = 2;

// A scratch index: the session's checkout and index stay untouched.
export async function landOnMain<T>(git: Git, branch: string, plan: (projectDir: string) => MainEditPlan<T>): Promise<MainLanding<T>> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const outcome = await landAttempt(git, branch, plan);
    if (outcome.kind !== "retry") return outcome;
  }
  return { kind: "failed", reason: `${branch} moved twice while writing; nothing pushed — run it again` };
}

async function landAttempt<T>(git: Git, branch: string, plan: (projectDir: string) => MainEditPlan<T>): Promise<Attempt<T>> {
  const tip = pinDefault(git, branch);
  if (!tip.ok) return { kind: "failed", reason: `can't read origin/${branch}: ${tip.reason}; nothing written` };
  const project = await baseProject(git, tip.value);
  if (!project.ok) return { kind: "failed", reason: project.reason };

  const edit = plan(project.value.dir);
  if (edit.kind !== "write") return edit;

  const entries = indexEntries(git, project.value.root, "files" in edit ? edit.files : [edit]);
  if (!entries.ok) return { kind: "failed", reason: entries.reason };
  const commit = commitOnto(git, tip.value, entries.value, edit.message);
  if (!commit.ok) return { kind: "failed", reason: commit.reason };

  const pushed = git.run(["push", "-q", "origin", `${commit.value}:refs/heads/${branch}`]);
  if (pushed.code !== 0 && NON_FAST_FORWARD.test(pushed.stderr)) return { kind: "retry" };
  if (pushed.code !== 0) return { kind: "failed", reason: `push to ${branch} refused: ${gitFailureReason(pushed.stderr)}` };
  return { kind: "landed", sha: commit.value, landed: edit.landed };
}

function indexEntries(git: Git, root: string, files: readonly FileEdit[]): Result<string> {
  let entries = "";
  for (const { file, text } of files) {
    const blob = git.out(["hash-object", "-w", "--stdin"], { stdin: text });
    if (!blob.ok) return blob;
    entries += `100644 blob ${blob.value}\t${relative(root, file)}\0`;
  }
  return { ok: true, value: entries };
}
