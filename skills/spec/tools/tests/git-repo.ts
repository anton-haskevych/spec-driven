import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { systemAsyncRunner, systemRunner, type AsyncRunner, type Runner } from "../core/run";

// CI has no git identity, and a developer's global config (hooks, signing) must not leak into tests.
const ISOLATED_GIT_ENV = {
  GIT_AUTHOR_NAME: "spec-tests",
  GIT_AUTHOR_EMAIL: "spec-tests@example.com",
  GIT_COMMITTER_NAME: "spec-tests",
  GIT_COMMITTER_EMAIL: "spec-tests@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

// Code under test spawns its own git; route it through the same isolated identity.
export const isolatedRunner: Runner = {
  run: (argv, options = {}) => systemRunner.run(argv, { ...options, env: { ...ISOLATED_GIT_ENV, ...options.env } }),
};

const IDENTITY_ENV = ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL", "EMAIL"];
const NO_SHARED_CONFIG = { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };

// A machine with no git identity, for code under test only: build repos with isolatedRunner.
// The keys are unset, not blanked: an empty GIT_AUTHOR_NAME overrides a repo's user.name.
export const anonymousRunner: Runner = {
  run(argv, options = {}) {
    const saved = IDENTITY_ENV.map((key) => [key, process.env[key]] as const);
    for (const key of IDENTITY_ENV) delete process.env[key];
    try {
      return systemRunner.run(argv, { ...options, env: { ...NO_SHARED_CONFIG, ...options.env } });
    } finally {
      for (const [key, value] of saved) if (value !== undefined) process.env[key] = value;
    }
  },
};

export const isolatedAsyncRunner: AsyncRunner = {
  run: (argv, options = {}) => systemAsyncRunner.run(argv, { ...options, env: { ...ISOLATED_GIT_ENV, ...options.env } }),
};

export interface WorkingCopy {
  dir: string;
  git(...args: string[]): string;
  write(path: string, text: string): void;
  commitAll(message: string): void;
}

export interface TestRepo extends WorkingCopy {
  root: string;
  origin: string;
  // A second clone of origin: another session moving the default branch.
  clone(name: string): WorkingCopy;
  // A linked worktree at <root>/<name> on a new branch from HEAD.
  addWorktree(name: string, branch: string): WorkingCopy;
  cleanup(): void;
}

function runGit(cwd: string, args: readonly string[]): string {
  const result = isolatedRunner.run(["git", ...args], { cwd });
  if (result.code !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function workingCopy(dir: string): WorkingCopy {
  return {
    dir,
    git: (...args) => runGit(dir, args),
    write(path, text) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    },
    commitAll(message) {
      runGit(dir, ["add", "-A"]);
      runGit(dir, ["commit", "-q", "--allow-empty", "-m", message]);
    },
  };
}

export function repoWithOrigin(prefix: string, branch = "main"): TestRepo {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const origin = join(root, "origin.git");
  runGit(root, ["init", "-q", "--bare", "-b", branch, "origin.git"]);
  runGit(root, ["init", "-q", "-b", branch, "work"]);
  const repo: TestRepo = {
    ...workingCopy(join(root, "work")),
    root,
    origin,
    clone(name) {
      runGit(root, ["clone", "-q", origin, name]);
      return workingCopy(join(root, name));
    },
    addWorktree(name, branch) {
      runGit(join(root, "work"), ["worktree", "add", "-q", "-b", branch, join(root, name)]);
      return workingCopy(join(root, name));
    },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
  repo.git("remote", "add", "origin", origin);
  repo.commitAll("init");
  repo.git("push", "-q", "-u", "origin", branch);
  repo.git("remote", "set-head", "origin", branch);
  return repo;
}
