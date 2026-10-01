import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitAt } from "../core/git";
import type { Runner } from "../core/run";
import { mergeTreeOutcome, publishDocs } from "../publish/publish";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";

describe("mergeTreeOutcome", () => {
  test("exit 0 is the merged tree", () => {
    expect(mergeTreeOutcome({ code: 0, stdout: "abc\n", stderr: "" })).toEqual({ ok: true, value: "abc" });
  });

  test("exit 1 names the conflicting files and says to merge main", () => {
    const outcome = mergeTreeOutcome({ code: 1, stdout: "abc\ndocs/specs/a/design.md\n\n", stderr: "" });
    expect(outcome).toEqual({ ok: false, reason: "diverged on main in docs/specs/a/design.md — merge main first; nothing pushed" });
  });

  test("any other exit is an error, not a conflict", () => {
    const outcome = mergeTreeOutcome({ code: 129, stdout: "", stderr: "error: unknown option `write-tree'\n" });
    expect(outcome).toEqual({ ok: false, reason: "git merge-tree failed (needs git ≥ 2.38): error: unknown option `write-tree'" });
  });
});

const INDEX = "docs/specs/a/ledger/INDEX.md";

describe("publishDocs (real git)", () => {
  let repo: TestRepo;
  let other: WorkingCopy;

  beforeEach(() => {
    repo = repoWithOrigin("spec-publish-");
    repo.write(".gitattributes", "docs/specs/**/INDEX.md merge=union\n");
    repo.write(INDEX, "- a\n");
    repo.write("docs/specs/a/progress.md", "- [ ] Phase 1\n");
    repo.write("docs/specs/a/design.md", "budget 100\n");
    repo.commitAll("spec a");
    repo.git("push", "-q", "origin", "main");
    other = repo.clone("other");
    repo.git("checkout", "-q", "-b", "feat");
  });

  afterEach(() => repo.cleanup());

  const onOrigin = (path: string) => repo.git("--git-dir", repo.origin, "show", `main:${path}`);
  const originMain = () => repo.git("--git-dir", repo.origin, "rev-parse", "main");
  const mainMoves = (path: string, text: string) => {
    other.git("pull", "-q", "--no-rebase", "origin", "main");
    other.write(path, text);
    other.commitAll(`main edits ${path}`);
    other.git("push", "-q", "origin", "main");
  };
  const publish = (runner: Runner = isolatedRunner) => publishDocs(gitAt(repo.dir, runner), { defaultBranch: "main", spec: "a" });

  test("lands only spec docs on main, unions INDEX rows, and merges the snapshot back as a no-op", () => {
    repo.write(INDEX, "- a\n- b\n");
    repo.write("docs/specs/a/progress.md", "- [x] Phase 1\n");
    repo.write("src/app.ts", "branch code\n");
    repo.commitAll("work");
    mainMoves(INDEX, "- a\n- c\n");
    const before = originMain();

    const outcome = publish();
    if (!outcome.ok || outcome.value.kind !== "published") throw new Error(JSON.stringify(outcome));
    expect(outcome.value.files).toEqual([INDEX, "docs/specs/a/progress.md"]);
    expect(outcome.value.main).toBe(before);
    expect(outcome.value.mergeBack).toEqual({ ok: true, value: undefined });
    expect(onOrigin(INDEX).split("\n").sort()).toEqual(["- a", "- b", "- c"]);
    expect(onOrigin("docs/specs/a/progress.md")).toBe("- [x] Phase 1");
    expect(() => onOrigin("src/app.ts")).toThrow();
    expect(repo.git("diff", "HEAD^1", "HEAD")).toBe("");

    mainMoves(INDEX, "- a\n- c\n- f\n");
    repo.git("merge", "-q", "--no-edit", "origin/main");
    repo.write("docs/specs/a/progress.md", "- [x] Phase 1\n- [ ] Phase 2\n");
    repo.commitAll("more");
    const second = publish();
    expect(second.ok && second.value.kind).toBe("published");
    expect(onOrigin(INDEX).split("\n").sort()).toEqual(["- a", "- b", "- c", "- f"]);
  });

  test("refuses when main edited the same line (the $150 case) and pushes nothing", () => {
    mainMoves("docs/specs/a/design.md", "budget 150\n");
    repo.write("docs/specs/a/design.md", "budget 120\n");
    repo.commitAll("branch budget");
    const before = originMain();

    const outcome = publish();
    expect(outcome).toEqual({ ok: false, reason: "diverged on main in docs/specs/a/design.md — merge main first; nothing pushed" });
    expect(originMain()).toBe(before);
  });

  test("main moving after the pin is caught by the push and rebuilt once on the new tip", () => {
    repo.write("docs/specs/a/progress.md", "- [x] Phase 1\n");
    repo.commitAll("tick");
    let moved = 0;
    const racing: Runner = {
      run(argv, options) {
        if (argv[1] === "merge-tree" && moved++ === 0) mainMoves("src/other.ts", "x\n");
        return isolatedRunner.run(argv, options);
      },
    };

    const outcome = publish(racing);
    expect(outcome.ok && outcome.value.kind).toBe("published");
    expect(onOrigin("src/other.ts")).toBe("x");
    expect(onOrigin("docs/specs/a/progress.md")).toBe("- [x] Phase 1");
  });

  test("stops after one rebuild when main keeps moving", () => {
    repo.write("docs/specs/a/progress.md", "- [x] Phase 1\n");
    repo.commitAll("tick");
    let n = 0;
    const racing: Runner = {
      run(argv, options) {
        if (argv[1] === "merge-tree") mainMoves(`src/race-${n++}.ts`, "x\n");
        return isolatedRunner.run(argv, options);
      },
    };

    const outcome = publish(racing);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.reason).toStartWith("main moved twice while publishing");
    expect(n).toBe(2);
  });

  test("any other rejection stops at once, without a rebuild", () => {
    const hook = join(repo.origin, "hooks", "pre-receive");
    writeFileSync(hook, "#!/bin/sh\necho 'protected branch' >&2\nexit 1\n");
    chmodSync(hook, 0o755);
    repo.write("docs/specs/a/progress.md", "- [x] Phase 1\n");
    repo.commitAll("tick");
    let mergeTrees = 0;
    const counting: Runner = {
      run(argv, options) {
        if (argv[1] === "merge-tree") mergeTrees++;
        return isolatedRunner.run(argv, options);
      },
    };

    const outcome = publish(counting);
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.reason).toContain("protected branch");
    expect(mergeTrees).toBe(1);
  });

  test("publishes cleanly after merging a main that holds another branch's snapshot", () => {
    repo.write("docs/specs/a/progress.md", "- [x] Phase 1\n");
    repo.commitAll("tick a");
    expect(publish().ok).toBe(true);

    other.git("pull", "-q", "--no-rebase", "origin", "main");
    other.git("checkout", "-q", "-b", "feat-b", "HEAD~1");
    other.write("docs/specs/b/progress.md", "- [ ] Phase 1\n");
    other.commitAll("spec b");
    other.git("merge", "-q", "--no-edit", "origin/main");
    other.write("docs/specs/b/progress.md", "- [x] Phase 1\n");
    other.commitAll("tick b");

    const outcome = publishDocs(gitAt(other.dir, isolatedRunner), { defaultBranch: "main", spec: "b" });
    if (!outcome.ok || outcome.value.kind !== "published") throw new Error(JSON.stringify(outcome));
    expect(outcome.value.files).toEqual(["docs/specs/b/progress.md"]);
    expect(onOrigin("docs/specs/a/progress.md")).toBe("- [x] Phase 1");
  });

  test("nothing changed since the last publish → nothing pushed", () => {
    repo.write("src/app.ts", "code only\n");
    repo.commitAll("code");
    const before = originMain();
    expect(publish()).toEqual({ ok: true, value: { kind: "nothing", deleted: [], main: before } });
    expect(originMain()).toBe(before);
  });
});
