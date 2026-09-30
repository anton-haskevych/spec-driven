import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { systemRunner } from "../core/run";

// CI has no git identity, and a developer's global config (hooks, signing) must not leak into tests.
const ISOLATED_GIT_ENV = {
  GIT_AUTHOR_NAME: "spec-tests",
  GIT_AUTHOR_EMAIL: "spec-tests@example.com",
  GIT_COMMITTER_NAME: "spec-tests",
  GIT_COMMITTER_EMAIL: "spec-tests@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

export interface TestRepo {
  root: string;
  dir: string;
  git(...args: string[]): string;
  write(path: string, text: string): void;
  commitAll(message: string): void;
  cleanup(): void;
}

export function repoWithOrigin(prefix: string, branch = "main"): TestRepo {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const dir = join(root, "work");
  const git = (cwd: string, args: string[]) => {
    const result = systemRunner.run(["git", ...args], { cwd, env: ISOLATED_GIT_ENV });
    if (result.code !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
    return result.stdout.trim();
  };
  git(root, ["init", "-q", "--bare", "-b", branch, "origin.git"]);
  git(root, ["init", "-q", "-b", branch, "work"]);
  git(dir, ["remote", "add", "origin", join(root, "origin.git")]);

  const repo: TestRepo = {
    root,
    dir,
    git: (...args) => git(dir, args),
    write(path, text) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    },
    commitAll(message) {
      git(dir, ["add", "-A"]);
      git(dir, ["commit", "-q", "--allow-empty", "-m", message]);
    },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
  repo.commitAll("init");
  git(dir, ["push", "-q", "-u", "origin", branch]);
  git(dir, ["remote", "set-head", "origin", branch]);
  return repo;
}
