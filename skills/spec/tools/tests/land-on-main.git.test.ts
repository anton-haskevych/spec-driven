import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { gitAt } from "../core/git";
import { landOnMain, type MainEditPlan } from "../core/land-on-main";
import type { Runner } from "../core/run";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const NOTE = "docs/specs/a/notes.md";

describe("landOnMain (real git)", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = repoWithOrigin("spec-land-on-main-");
    repo.write(NOTE, "one\n");
    repo.commitAll("notes");
    repo.git("push", "-q", "origin", "main");
  });

  afterEach(() => repo.cleanup());

  const onOrigin = () => repo.git("--git-dir", repo.origin, "show", `main:${NOTE}`);
  const appendLine = (line: string) => (projectDir: string): MainEditPlan<string> => {
    const file = join(projectDir, NOTE);
    const text = readTextIfExists(file) ?? "";
    return text.includes(line) ? { kind: "unchanged", reason: `${line} already there` } : { kind: "write", file, text: `${text}${line}\n`, message: `add ${line}`, landed: line };
  };
  const land = (plan: (dir: string) => MainEditPlan<string>, runner: Runner = isolatedRunner) => landOnMain(gitAt(repo.dir, runner), "main", plan);

  test("the plan reads the fetched tip, and the commit lands there without touching the checkout", async () => {
    const other = repo.clone("other");
    other.write(NOTE, "one\ntwo\n");
    other.commitAll("two");
    other.git("push", "-q", "origin", "main");
    const head = repo.git("rev-parse", "HEAD");

    const outcome = await land(appendLine("three"));
    expect(outcome).toMatchObject({ kind: "landed", landed: "three" });
    expect(onOrigin()).toBe("one\ntwo\nthree");
    expect(repo.git("rev-parse", "HEAD")).toBe(head);
    expect(repo.git("status", "--porcelain")).toBe("");
  });

  test("an unchanged plan commits nothing and says why", async () => {
    const before = repo.git("--git-dir", repo.origin, "rev-parse", "main");
    expect(await land(appendLine("one"))).toEqual({ kind: "unchanged", reason: "one already there" });
    expect(repo.git("--git-dir", repo.origin, "rev-parse", "main")).toBe(before);
  });

  test("a push that loses the race re-plans on the new tip", async () => {
    const other = repo.clone("other");
    let raced = false;
    const racing: Runner = {
      run(argv, options) {
        if (!raced && argv[1] === "push") {
          raced = true;
          other.write(NOTE, "one\nraced\n");
          other.commitAll("raced");
          other.git("push", "-q", "origin", "main");
        }
        return isolatedRunner.run(argv, options);
      },
    };
    expect(await land(appendLine("mine"), racing)).toMatchObject({ kind: "landed" });
    expect(onOrigin()).toBe("one\nraced\nmine");
  });

  const racingTimes = (times: number): Runner => {
    const other = repo.clone("other");
    let raced = 0;
    return {
      run(argv, options) {
        if (raced < times && argv[1] === "push") {
          raced += 1;
          other.git("pull", "-q", "--rebase", "origin", "main");
          other.write(NOTE, `${readFileSync(join(other.dir, NOTE), "utf8")}raced ${raced}\n`);
          other.commitAll(`raced ${raced}`);
          other.git("push", "-q", "origin", "main");
        }
        return isolatedRunner.run(argv, options);
      },
    };
  };

  test("it tries five times before giving up", async () => {
    expect(await land(appendLine("mine"), racingTimes(4))).toMatchObject({ kind: "landed" });
    expect(onOrigin()).toEndWith("raced 4\nmine");
  });

  test("a branch that moves on every try fails and pushes nothing", async () => {
    const outcome = await land(appendLine("mine"), racingTimes(5));
    expect(outcome).toEqual({ kind: "failed", reason: "main moved 5 times while writing; nothing written — run it again" });
    expect(onOrigin()).not.toContain("mine");
  }, 20_000);

  test("the push skips pre-push hooks, never prompts and has a time limit", async () => {
    repo.write(".git/hooks/pre-push", "#!/bin/sh\nexit 1\n");
    chmodSync(join(repo.dir, ".git/hooks/pre-push"), 0o755);
    const seen: { argv: readonly string[]; prompt?: string; timeoutMs?: number }[] = [];
    const recording: Runner = {
      run(argv, options) {
        if (argv[1] === "push" || argv[1] === "fetch") seen.push({ argv, prompt: options?.env?.GIT_TERMINAL_PROMPT, timeoutMs: options?.timeoutMs });
        return isolatedRunner.run(argv, options);
      },
    };
    expect(await land(appendLine("hooked"), recording)).toMatchObject({ kind: "landed" });
    expect(onOrigin()).toBe("one\nhooked");
    expect(seen.map((call) => call.argv[1])).toEqual(["fetch", "push"]);
    for (const call of seen) expect(call).toMatchObject({ prompt: "0", timeoutMs: 10_000 });
    expect(seen[1]?.argv).toContain("--no-verify");
  });

  test("an unreachable origin fails with git's reason and writes nothing", async () => {
    repo.git("remote", "set-url", "origin", join(repo.dir, "no-such-origin"));
    const outcome = await land(appendLine("lost"));
    expect(outcome.kind).toBe("failed");
    expect(outcome.kind === "failed" && outcome.reason).toStartWith("can't read origin/main:");
  });

  test("one plan can write several files in one commit", async () => {
    const outcome = await land((projectDir) => ({
      kind: "write",
      files: [
        { file: join(projectDir, NOTE), text: "one\nboth\n" },
        { file: join(projectDir, "docs/specs/a/second.md"), text: "second\n" },
      ],
      message: "both files",
      landed: "both",
    }));
    expect(outcome).toMatchObject({ kind: "landed", landed: "both" });
    expect(onOrigin()).toBe("one\nboth");
    expect(repo.git("--git-dir", repo.origin, "show", "main:docs/specs/a/second.md")).toBe("second");
    expect(repo.git("--git-dir", repo.origin, "log", "--format=%s", "-1", "main")).toBe("both files");
  });
});
