import { dirname } from "node:path";
import type { AsyncRunner, RunResult, Runner } from "../core/run";

export type CannedRuns = ReadonlyArray<readonly [argvPrefix: readonly string[], result: Partial<RunResult>]>;

const FAILED: RunResult = { code: 1, stdout: "", stderr: "no canned result" };

export function stubRunner(canned: CannedRuns): Runner & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    run(argv) {
      calls.push([...argv]);
      const match = canned.find(([prefix]) => prefix.every((part, index) => argv[index] === part));
      return match ? { code: 0, stdout: "", stderr: "", ...match[1] } : FAILED;
    },
  };
}

export interface AsyncCall {
  argv: string[];
  cwd?: string;
}

export function asyncStubRunner(canned: CannedRuns): AsyncRunner & { calls: AsyncCall[] } {
  const sync = stubRunner(canned);
  const calls: AsyncCall[] = [];
  return {
    calls,
    async run(argv, options = {}) {
      calls.push(options.cwd === undefined ? { argv: [...argv] } : { argv: [...argv], cwd: options.cwd });
      return sync.run(argv, options);
    },
  };
}

// Real processes for everything but gh, which answers from `canned`, so board tests never reach GitHub.
export function cannedGh(runner: AsyncRunner, canned: CannedRuns): AsyncRunner {
  const gh = asyncStubRunner(canned);
  return { run: (argv, options) => (argv[0] === "gh" ? gh.run(argv, options) : runner.run(argv, options)) };
}

// Answers each argv prefix from a queue, so a repeated call can get a different reply; the last reply repeats.
export function sequencedRunner(replies: Array<[readonly string[], Partial<RunResult>[]]>): Runner & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    run(argv) {
      calls.push([...argv]);
      const entry = replies.find(([prefix]) => prefix.every((part, index) => argv[index] === part));
      const reply = entry && (entry[1].length > 1 ? entry[1].shift() : entry[1][0]);
      return { code: 0, stdout: "", stderr: "", ...(reply ?? { code: 1, stderr: "no canned result" }) };
    },
  };
}

// gh answers from `gh` (a stub), everything else from `other` (real git), so a test pushes for real but never reaches GitHub.
export function routeGh(gh: Runner, other: Runner): Runner {
  return { run: (argv, options) => (argv[0] === "gh" ? gh.run(argv, options) : other.run(argv, options)) };
}

const NOT_A_REPO: RunResult = { code: 128, stdout: "", stderr: "fatal: not a git repository (or any of the parent directories): .git" };

// For code under test that defaults to real git in a temp folder that isn't a repo: same answers, no process.
export const notARepoRunner: Runner = {
  run(argv) {
    if (argv[0] !== "git") throw new Error(`notARepoRunner only answers git, not: ${argv.join(" ")}`);
    return NOT_A_REPO;
  },
};

// Like stubRunner, but it answers only the exact argv it was given and throws on any other: code under test
// can't quietly take a fallback branch, or reach real git through a prefix that happened to match.
export function strictRunner(canned: CannedRuns): Runner & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    run(argv) {
      calls.push([...argv]);
      const match = canned.find(([known]) => known.length === argv.length && known.every((part, index) => argv[index] === part));
      if (!match) throw new Error(`no answer for: ${argv.join(" ")}`);
      return { code: 0, stdout: "", stderr: "", ...match[1] };
    },
  };
}

export interface GitStubOptions {
  commonDir: string;
  toplevel?: string;
  // null: origin/HEAD is unset and gh can't name it either.
  defaultBranch?: string | null;
  branch?: string;
  head?: string;
  ident?: string;
  // Answered first; canned results only, never a runner, so nothing falls through to real git.
  answers?: CannedRuns;
}

const STUB_HEAD = "b04412a8f14deab768d420d9dd09b78042b0d2fb";
const NO_DEFAULT_BRANCH: Partial<RunResult> = { code: 1, stderr: "fatal: ref refs/remotes/origin/HEAD is not a symbolic ref" };

// What a checkout says about itself when a command asks, with no repo behind it. The record, land, mainline and
// remote adapters are not answered here: they are GitSeams, and asking git for them throws.
export function gitStub(options: GitStubOptions): Runner & { calls: string[][] } {
  const { commonDir, toplevel = dirname(commonDir), defaultBranch = "main", branch = "feat/x", head = STUB_HEAD, ident = "spec-tests" } = options;
  const identity = { stdout: `${ident} <spec-tests@example.com> 1762992000 +0000\n` };
  const line = (stdout: string): Partial<RunResult> => ({ stdout: `${stdout}\n` });
  return strictRunner([
    ...(options.answers ?? []),
    [["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], line(commonDir)],
    [["git", "rev-parse", "--show-toplevel"], line(toplevel)],
    [["git", "symbolic-ref", "--short", "refs/remotes/origin/HEAD"], defaultBranch === null ? NO_DEFAULT_BRANCH : line(`origin/${defaultBranch}`)],
    [["gh", "repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"], defaultBranch === null ? { code: 1, stderr: "gh: not answered" } : line(defaultBranch)],
    [["git", "branch", "--show-current"], line(branch)],
    [["git", "symbolic-ref", "--short", "-q", "HEAD"], line(branch)],
    [["git", "rev-parse", "HEAD"], line(head)],
    [["git", "var", "GIT_AUTHOR_IDENT"], identity],
    [["git", "-c", "user.useConfigOnly=true", "-c", "user.email=spec-driven@invalid", "var", "GIT_AUTHOR_IDENT"], identity],
    [["git", "--no-optional-locks", "status", "--porcelain", "-z", "--untracked-files=normal"], { stdout: "" }],
    [["git", "remote"], line("origin")],
    [["git", "rev-list", "--count", "HEAD", "--not", "--remotes"], line("0")],
  ]);
}
