import { relative } from "node:path";
import { baseProject } from "../mainline/load";
import { commitOnto } from "../publish/commit-onto";
import { pinDefault } from "../publish/snapshot";
import type { FileEdit } from "./apply-edits";
import type { Git } from "./git";
import { landOnRef, type FileChange, type RefEdit, type RefPort, type Tip } from "./land-on-ref";
import { leasePushRun, NETWORK, pushDeclined, pushOutcome } from "./remote-push";
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

type Stop = Exclude<MainLanding<never>, { kind: "landed" }>;

// A scratch index: the session's checkout and index stay untouched.
export async function landOnMain<T>(git: Git, branch: string, plan: (projectDir: string) => MainEditPlan<T>): Promise<MainLanding<T>> {
  const port = branchPort(git, branch);
  const landing = await landOnRef<T, Stop>(port, (tip) => planAt(git, tip, plan), { name: branch });
  if (landing.kind === "stopped") return landing.outcome;
  if (landing.kind === "offline") return { kind: "failed", reason: `can't reach origin for ${branch}: ${landing.reason}; nothing written` };
  return landing;
}

function branchPort(git: Git, branch: string): RefPort {
  const ref = `refs/heads/${branch}`;
  return {
    fetchTip: () => {
      const tip = pinDefault(git, branch, NETWORK);
      return tip.ok ? { kind: "at", sha: tip.value } : { kind: "failed", reason: `can't read origin/${branch}: ${tip.reason}; nothing written` };
    },
    commit: (base, changes, message) => commitChanges(git, base, changes, message),
    push: (commit, lease) => {
      const result = leasePushRun(git, ref, lease.kind === "at" ? lease.sha : "", `${commit}:${ref}`);
      const declined = pushDeclined(result, ref);
      return declined ? { kind: "failed", reason: `push to ${branch} refused: ${declined}` } : pushOutcome(result, ref);
    },
  };
}

async function planAt<T>(git: Git, tip: Tip, plan: (projectDir: string) => MainEditPlan<T>): Promise<RefEdit<T, Stop>> {
  if (tip.kind !== "at") return { kind: "stop", outcome: { kind: "failed", reason: "the default branch has no commits on origin; nothing written" } };
  const project = await baseProject(git, tip.sha);
  if (!project.ok) return { kind: "stop", outcome: { kind: "failed", reason: project.reason } };
  const edit = plan(project.value.dir);
  if (edit.kind !== "write") return { kind: "stop", outcome: edit };
  const files = "files" in edit ? edit.files : [edit];
  const changes = files.map(({ file, text }) => ({ path: relative(project.value.root, file), text }));
  return { kind: "commit", changes, message: edit.message, landed: edit.landed };
}

function commitChanges(git: Git, base: Tip, changes: readonly FileChange[], message: string): Result<string> {
  let entries = "";
  for (const { path, text } of changes) {
    const blob = git.out(["hash-object", "-w", "--stdin"], { stdin: text ?? "" });
    if (!blob.ok) return blob;
    entries += `100644 blob ${blob.value}\t${path}\0`;
  }
  return commitOnto(git, base.kind === "at" ? base.sha : undefined, entries, message);
}
