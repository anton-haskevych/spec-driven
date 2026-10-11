import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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
});
