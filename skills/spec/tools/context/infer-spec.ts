import { join } from "node:path";
import { defaultBranch, type Runner } from "../core/run";
import { listSpecs, locateSpecFile } from "../core/spec-folders";

const RENAME_OR_COPY = /^[RC]|^.[RC]/;

export function specsInPlay(projectDir: string, runner: Runner): string[] | undefined {
  const git = (...args: string[]) => runner.run(["git", ...args], { cwd: projectDir });
  const toplevel = git("rev-parse", "--show-toplevel");
  if (toplevel.code !== 0) return undefined;

  const root = toplevel.stdout.trim();
  const paths = [...branchCommitPaths(projectDir, runner), ...uncommittedPaths(git("status", "--porcelain", "-z", "--untracked-files=all").stdout)];
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

function uncommittedPaths(porcelainZ: string): string[] {
  const records = porcelainZ.split("\0");
  const paths: string[] = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index] ?? "";
    if (record.length > 3) paths.push(record.slice(3));
    if (RENAME_OR_COPY.test(record)) index++;
  }
  return paths;
}
