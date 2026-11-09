import { realpathSync } from "node:fs";
import { isAbsolute } from "node:path";
import { gitAt, gitCommonDir } from "../core/git";
import type { Result } from "../core/result";
import type { Runner } from "../core/run";
import { loadWorkspaces } from "../workspaces/list";

export function verifyPilotWorkspace(cwd: string, legacyProjectDir: string, runner: Runner): Result<string> {
  if (!isAbsolute(cwd) || !isAbsolute(legacyProjectDir)) return { ok: false, reason: "pilot requires absolute initiating cwd and legacy checkout paths" };
  try {
    const here = realpathSync(cwd);
    const git = gitAt(here, runner);
    const root = git.out(["rev-parse", "--show-toplevel"]);
    if (!root.ok) return root;
    if (realpathSync(root.value) !== here) return { ok: false, reason: "pilot initiating cwd must be the exclusive checkout root" };
    const common = gitCommonDir(git);
    if (!common.ok) return common;
    const legacy = gitCommonDir(gitAt(legacyProjectDir, runner));
    if (!legacy.ok) return legacy;
    if (realpathSync(common.value) === realpathSync(legacy.value)) return { ok: false, reason: "pilot must use a separate Git common directory from the legacy checkout" };
    const workspaces = loadWorkspaces(git);
    if (!workspaces.ok) return workspaces;
    if (workspaces.value.length !== 1 || realpathSync(workspaces.value[0]!.path) !== here) {
      return { ok: false, reason: "pilot requires one exclusive checkout with no linked worktrees" };
    }
    return { ok: true, value: here };
  } catch {
    return { ok: false, reason: "pilot checkout/common-directory evidence unavailable" };
  }
}
