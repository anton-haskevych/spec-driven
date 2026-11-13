import { gitAt, type Git } from "../core/git";
import { defaultBranch, type Runner } from "../core/run";
import { pushBranch, SAVE } from "../publish/push";

const HELD = /^claim: (took |.* is already yours$)/;

// A phase's branch exists on origin from the moment it is claimed, so nothing worked on is only local. Kept
// out of claim.ts, which codex-runtime-support 2b also edits.
export function pushAfterTake(projectDir: string, runner: Runner, line: string): string {
  if (!HELD.test(line.split("\n")[0] ?? "")) return line;
  const note = pushClaimedBranch(gitAt(projectDir, runner), defaultBranch(projectDir, runner));
  return note ? `${line}\n${note}` : line;
}

// The default branch is never pushed here: a claim in the main checkout holds no code of its own.
function pushClaimedBranch(git: Git, base: string | undefined): string | undefined {
  const branch = git.out(["symbolic-ref", "--short", "-q", "HEAD"]);
  if (!base || !branch.ok || !branch.value || branch.value === base) return undefined;
  const pushed = pushBranch(git, base, SAVE);
  return pushed.kind === "pushed" ? undefined : `claim: ${branch.value} is not on origin yet (${pushed.reason})`;
}
