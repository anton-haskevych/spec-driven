import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { gitAt, type Git } from "../core/git";
import { mergeLane, pushLane, type LaneRef } from "../publish/merge-back";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";

// One origin for the file; each case uses its own spec, so its spec branch and lane are its own.
describe("merge-back (real git)", () => {
  let repo: TestRepo;
  let other: WorkingCopy;

  beforeAll(() => {
    repo = repoWithOrigin("spec-merge-back-");
    other = repo.clone("other");
  });
  afterAll(() => repo.cleanup());

  const git = () => gitAt(repo.dir, isolatedRunner);
  const onOrigin = (branch: string) => repo.git("--git-dir", repo.origin, "rev-parse", "--verify", "-q", `refs/heads/${branch}`);

  function laneFor(spec: string): LaneRef {
    repo.git("fetch", "-q", "origin");
    repo.git("push", "-q", "origin", `origin/main:refs/heads/feat/${spec}`);
    repo.git("fetch", "-q", "origin");
    repo.git("checkout", "-q", "-b", `feat/${spec}-pr-a`, `origin/feat/${spec}`);
    return { spec, branch: `feat/${spec}-pr-a`, specBranch: `feat/${spec}`, defaultBranch: "main" };
  }

  function landOn(branch: string, file: string, text: string): void {
    other.git("fetch", "-q", "origin");
    other.git("checkout", "-q", "-B", branch, `origin/${branch}`);
    other.write(file, text);
    other.commitAll(`${file} on ${branch}`);
    other.git("push", "-q", "origin", branch);
  }

  test("a lane that holds both branches merges nothing", () => {
    const lane = laneFor("holds");
    expect(mergeLane(git(), lane)).toEqual({ kind: "merged", specBranch: 0, main: 0 });
  });

  test("merges the spec branch, then main, and counts what came in", () => {
    const lane = laneFor("clean");
    landOn("feat/clean", "clean/spec.txt", "s\n");
    landOn("main", "clean/main.txt", "m\n");
    expect(mergeLane(git(), lane)).toEqual({ kind: "merged", specBranch: 1, main: 1 });
    expect(repo.git("merge-base", "--is-ancestor", "origin/main", "HEAD")).toBe("");
    expect(repo.git("merge-base", "--is-ancestor", "origin/feat/clean", "HEAD")).toBe("");
  });

  test("a conflict with main is left in progress with its paths, and --push refuses until it is committed", () => {
    const lane = laneFor("conflict");
    repo.write("conflict/a.txt", "lane\n");
    repo.commitAll("lane edit");
    landOn("main", "conflict/a.txt", "main\n");
    expect(mergeLane(git(), lane)).toEqual({ kind: "conflict", with: "main", paths: ["conflict/a.txt"] });
    expect(pushLane(git(), lane)).toEqual({ kind: "refused", reason: "a merge is in progress here; resolve it and commit first" });
    repo.git("merge", "--abort");
  });

  test("--push lands the lane on the spec branch as a fast-forward and pushes the lane to its own name", () => {
    const lane = laneFor("push");
    repo.write("push/a.txt", "a\n");
    repo.commitAll("phase work");
    const head = repo.git("rev-parse", "HEAD");
    expect(pushLane(git(), lane)).toEqual({ kind: "pushed", commits: 1 });
    expect(onOrigin("feat/push")).toBe(head);
    expect(onOrigin("feat/push-pr-a")).toBe(head);
  });

  test("--push refuses when HEAD lacks the spec branch's tip: run merge-back again", () => {
    const lane = laneFor("behind");
    landOn("feat/behind", "behind/other-lane.txt", "o\n");
    repo.write("behind/a.txt", "a\n");
    repo.commitAll("phase work");
    expect(pushLane(git(), lane)).toEqual({ kind: "moved" });
  });

  test("a spec branch that moves between the check and the push is refused as moved; the lane is already saved", () => {
    const lane = laneFor("race");
    repo.write("race/a.txt", "a\n");
    repo.commitAll("phase work");
    const head = repo.git("rev-parse", "HEAD");
    const racing = beforeLease(git(), () => landOn("feat/race", "race/other.txt", "o\n"));
    expect(pushLane(racing, lane)).toEqual({ kind: "moved" });
    expect(onOrigin("feat/race-pr-a")).toBe(head);
    expect(onOrigin("feat/race")).not.toBe(head);
  });

  test("docs publish after the push, and a refusal never undoes it", () => {
    const lane = laneFor("docs");
    repo.write("docs/a.txt", "a\n");
    repo.commitAll("phase work");
    const head = repo.git("rev-parse", "HEAD");
    expect(pushLane(git(), lane, () => ({ ok: false, reason: "diverged on main in docs/specs/docs/CLAUDE.md" }))).toEqual({
      kind: "pushed",
      commits: 1,
      docs: { ok: false, reason: "diverged on main in docs/specs/docs/CLAUDE.md" },
    });
    expect(onOrigin("feat/docs")).toBe(head);
  });
});

function beforeLease(git: Git, race: () => void): Git {
  return {
    run(args, options) {
      if (args[0] === "push" && args.some((arg) => arg.startsWith("--force-with-lease="))) race();
      return git.run(args, options);
    },
    out: (args, options) => git.out(args, options),
  };
}
