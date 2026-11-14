import type { Git } from "../core/git";
import { hasPhaseLines } from "./export";

const HISTORY_LIMIT = 50;

// `path` is relative to the git working directory. `join --tidy` cuts progress.md to a stub; the list as people wrote it (labels, sections) is in history.
export function frozenProgress(git: Git, ref: string, path: string): string | undefined {
  const log = git.out(["log", "--format=%H", `-n${HISTORY_LIMIT}`, ref, "--", path]);
  if (!log.ok) return undefined;
  for (const sha of log.value.split("\n").filter(Boolean)) {
    const text = git.run(["show", `${sha}:./${path}`]);
    if (text.code === 0 && hasPhaseLines(text.stdout)) return text.stdout;
  }
  return undefined;
}
