import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitAt } from "../core/git";
import type { Runner } from "../core/run";
import { landFocus } from "../focus/land";
import type { FocusAction } from "../focus/plan";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";

const claudeMd = (focus?: string) => `---\nstatus: active\n${focus === undefined ? "" : `focus: ${focus}\n`}---\n# Spec\n`;
const META = (spec: string) => `docs/specs/${spec}/CLAUDE.md`;

describe("landFocus (real git)", () => {
  let repo: TestRepo;
  let other: WorkingCopy;

  beforeEach(() => {
    repo = repoWithOrigin("spec-focus-land-");
    repo.write(META("a"), claudeMd("must"));
    repo.write(META("b"), claudeMd());
    repo.write(META("c"), claudeMd());
    repo.commitAll("specs");
    repo.git("push", "-q", "origin", "main");
    other = repo.clone("other");
  });

  afterEach(() => repo.cleanup());

  const onOrigin = (path: string) => repo.git("--git-dir", repo.origin, "show", `main:${path}`);
  const originLog = () => repo.git("--git-dir", repo.origin, "log", "--format=%s", "main").split("\n");
  const otherPushes = (path: string, text: string) => {
    other.git("pull", "-q", "--no-rebase", "origin", "main");
    other.write(path, text);
    other.commitAll(`other edits ${path}`);
    other.git("push", "-q", "origin", "main");
  };
  const land = (action: FocusAction, runner: Runner = isolatedRunner) => landFocus(gitAt(repo.dir, runner), { defaultBranch: "main", action });

  test("a stale clone reads the band on origin, pushes one file and leaves its checkout alone", async () => {
    otherPushes(META("c"), claudeMd("could"));
    const head = repo.git("rev-parse", "HEAD");

    const outcome = await land({ kind: "move", spec: "c", band: "must" });
    expect(outcome).toMatchObject({ kind: "landed", landed: { verb: "moved", spec: "c", band: "must" } });
    expect(onOrigin(META("c"))).toBe(claudeMd("must").trim());
    expect(repo.git("--git-dir", repo.origin, "diff", "--name-only", "main^", "main")).toBe(META("c"));
    expect(originLog()[0]).toBe("[focus] move c");
    expect(repo.git("rev-parse", "HEAD")).toBe(head);
    expect(repo.git("status", "--porcelain")).toBe("");
  });

  test("a push that lands between pin and push is retried once on the new tip", async () => {
    let raced = false;
    const racing: Runner = {
      run(argv, options) {
        if (!raced && argv[1] === "push") {
          raced = true;
          otherPushes(META("b"), claudeMd("should"));
        }
        return isolatedRunner.run(argv, options);
      },
    };

    const outcome = await land({ kind: "add", spec: "c", band: "must" }, racing);
    expect(outcome).toMatchObject({ kind: "landed", landed: { verb: "added", band: "must" } });
    expect(onOrigin(META("c"))).toBe(claudeMd("must").trim());
    expect(onOrigin(META("b"))).toBe(claudeMd("should").trim());
    expect(originLog().slice(0, 2)).toEqual(["[focus] add c", `other edits ${META("b")}`]);
  });

  test("a remote that refuses the push gives git's reason and writes nothing", async () => {
    const hook = join(repo.origin, "hooks", "pre-receive");
    writeFileSync(hook, "#!/bin/sh\necho 'protected branch' >&2\nexit 1\n");
    chmodSync(hook, 0o755);

    const outcome = await land({ kind: "add", spec: "b", band: "should" });
    expect(outcome.kind).toBe("failed");
    expect(outcome.kind === "failed" && outcome.reason).toMatch(/^push to main refused: .*declined/);
    expect(onOrigin(META("b"))).toBe(claudeMd().trim());
  });

  test("a spec that exists only on a branch is refused", async () => {
    repo.git("checkout", "-q", "-b", "feat");
    repo.write(META("d"), claudeMd());
    repo.commitAll("spec d on a branch");

    expect(await land({ kind: "add", spec: "d", band: "should" })).toEqual({
      kind: "refused",
      reason: "no spec named d on origin/main; land the spec first",
    });
  });

  test("drop removes the focus line on origin", async () => {
    const outcome = await land({ kind: "drop", spec: "a" });
    expect(outcome).toMatchObject({ kind: "landed", landed: { verb: "dropped", spec: "a" } });
    expect(onOrigin(META("a"))).toBe(claudeMd().trim());
  });

  test("an unreachable origin is reported before anything is written", async () => {
    repo.git("remote", "set-url", "origin", join(repo.root, "missing.git"));
    const outcome = await land({ kind: "drop", spec: "a" });
    expect(outcome.kind === "failed" && outcome.reason).toMatch(/^can't read origin\/main: .*; nothing written$/);
  });
});
