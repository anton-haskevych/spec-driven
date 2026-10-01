import { join } from "node:path";
import { parsePorcelainZ } from "../core/git-status";
import { defaultBranch, type Runner } from "../core/run";
import { listSpecs, locateSpecFile } from "../core/spec-folders";

export function specsInPlay(projectDir: string, runner: Runner): string[] | undefined {
  const git = (...args: string[]) => runner.run(["git", ...args], { cwd: projectDir });
  const toplevel = git("rev-parse", "--show-toplevel");
  if (toplevel.code !== 0) return undefined;

  const root = toplevel.stdout.trim();
  const paths = [...branchCommitPaths(projectDir, runner), ...parsePorcelainZ(git("status", "--porcelain", "-z", "--untracked-files=all").stdout)];
  const projectSpecs = new Set(listSpecs(projectDir).map((spec) => spec.name));
  const names = paths.flatMap((path) => locateSpecFile(join(root, path))?.spec.name ?? []);
  return [...new Set(names)].filter((name) => projectSpecs.has(name)).sort();
}

function branchCommitPaths(cwd: string, runner: Runner): string[] {
  const branch = defaultBranch(cwd, runner);
  if (!branch) return [];
  const base = runner.run(["git", "merge-base", "HEAD", `origin/${branch}`], { cwd });
  if (base.code !== 0) return [];
  const log = runner.run(["git", "log", "--name-only", "--format=", `${base.stdout.trim()}..HEAD`], { cwd });
  return log.code === 0 ? log.stdout.split("\n").filter(Boolean) : [];
}
