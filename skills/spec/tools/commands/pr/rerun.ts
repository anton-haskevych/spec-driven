import { systemRunner } from "../../core/run";
import { rerunPr, type RerunDeps } from "../../pr/actions/rerun";

export const PR_RERUN_USAGE = "pr rerun [<pr> | <spec-name> [<group>]]";

const systemDeps: RerunDeps = { runner: systemRunner, now: () => new Date() };

export function prRerun(projectDir: string, args: readonly string[], deps: RerunDeps = systemDeps): string {
  return args.length > 2 ? `usage: ${PR_RERUN_USAGE}` : rerunPr(projectDir, args, deps);
}
