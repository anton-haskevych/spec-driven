import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { joinCommand, type JoinDeps } from "../commands/join";
import type { Runner } from "../core/run";
import { RECORD_REF } from "../record/layout";
import { bannerLine } from "../plan/banner";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";
import { specFiles, SPEC, type PhaseSpec } from "./join-fixtures";

const SETTINGS = "docs/specs/_playbook/settings.md";
const BOARD_ON = "---\ndocs: main\nboard:\n  record: on\n---\n";
const SPEC_DIR = `docs/specs/${SPEC}`;
const PHASES: PhaseSpec[] = [
  { id: "1", done: true, tasks: [["One", true]] },
  { id: "2", tasks: ["Alpha", "Beta"] },
];
const NOW = new Date("2026-11-11T12:00:00Z");

function writeSpec(copy: WorkingCopy, settings: string, phases: readonly PhaseSpec[] = PHASES): void {
  copy.write(SETTINGS, settings);
  copy.write(`${SPEC_DIR}/CLAUDE.md`, "---\nstatus: active\n---\n# Spec\n");
  for (const [path, text] of specFiles(phases)) copy.write(`${SPEC_DIR}/${path}`, text);
}

describe("spec.ts join (real git)", () => {
  let repo: TestRepo;
  const deps = (runner: Runner = isolatedRunner): JoinDeps => ({ runner, asyncRunner: isolatedAsyncRunner, now: () => NOW });
  const joinIn = (copy: WorkingCopy, runner?: Runner) => joinCommand(copy.dir, [SPEC], deps(runner));
  const onRecord = (path: string) => JSON.parse(repo.git("--git-dir", repo.origin, "show", `${RECORD_REF}:${path}`));
  const recordLog = () => repo.git("--git-dir", repo.origin, "log", "--format=%s", RECORD_REF).split("\n");
  const progressOnMain = () => repo.git("--git-dir", repo.origin, "show", `main:${SPEC_DIR}/progress.md`);

  beforeEach(() => {
    repo = repoWithOrigin("spec-join-");
    writeSpec(repo, BOARD_ON);
    repo.commitAll("spec");
    repo.git("push", "-q", "origin", "main");
  });

  afterEach(() => repo.cleanup());

  test("writes the spec and its phases in one record commit, then lands the banner on main", async () => {
    const head = repo.git("rev-parse", "HEAD");
    const output = await joinIn(repo);
    expect(output).toMatch(new RegExp(`^join: ${SPEC} is on the board \\(2 phases, 3 tasks, 0 worktrees read\\) · banner landed on main \\([0-9a-f]{7}\\)$`));
    expect(onRecord(`specs/${SPEC}/spec.json`)).toMatchObject({ name: SPEC, planVersion: 1, phases: ["1", "2"], joinedFrom: head, layout: 2, status: "active" });
    expect(onRecord(`specs/${SPEC}/phases/2.json`)).toMatchObject({ needs: ["1"], tasks: [{ id: "2.1", text: "Alpha", done: false }, { id: "2.2", text: "Beta", done: false }] });
    expect(recordLog()).toEqual([`record: join ${SPEC}`]);
    expect(progressOnMain()).toContain(bannerLine("2026-11-11"));
    expect(repo.git("rev-parse", "HEAD")).toBe(head);
    expect(repo.git("status", "--porcelain")).toBe("");
  });

  test("the spec's fields and its merged PR come over from main's files", async () => {
    repo.write(`${SPEC_DIR}/CLAUDE.md`, "---\nstatus: active\nowner: Taras\nfocus: must\nship: auto\n---\n# Spec\n");
    repo.write(`${SPEC_DIR}/pr-opening.md`, "# PR\n\n## Spec state\n\nPR #37 merged 2026-11-10 as 9392c3f (squash).\n");
    repo.commitAll("fields");
    repo.git("push", "-q", "origin", "main");
    await joinIn(repo);
    expect(onRecord(`specs/${SPEC}/spec.json`)).toMatchObject({ layout: 2, status: "active", owner: "Taras", focus: "must", ship: "auto" });
    expect(onRecord(`specs/${SPEC}/prs/default.json`)).toEqual({ group: "default", branch: `feat/${SPEC}`, state: "merged", number: 37, mergedAt: "2026-11-10", mergedSha: "9392c3f", method: "squash" });
  });

  test("a tick made in a worktree is recorded as done with that tree's head", async () => {
    const tree = repo.addWorktree("pr-a", "feat/pr-a");
    writeSpec(tree, BOARD_ON, [PHASES[0] as PhaseSpec, { id: "2", tasks: [["Alpha", true], "Beta"] }]);
    tree.commitAll("tick Alpha");
    const treeHead = tree.git("rev-parse", "HEAD");

    const output = await joinIn(repo);
    expect(output.split("\n")).toEqual([
      `join: phase 2: 2.1 done in tree pr-a and open on main; recorded as done (${treeHead.slice(0, 7)})`,
      expect.stringMatching(new RegExp(`^join: ${SPEC} is on the board \\(2 phases, 3 tasks, 1 worktree read\\)`)),
    ]);
    expect(onRecord(`specs/${SPEC}/phases/2.json`).tasks[0]).toEqual({ id: "2.1", text: "Alpha", done: true, evidence: treeHead });
  });

  test("--from-tree adds this tree's ticks made after the join, matched by text, with its head", async () => {
    await joinIn(repo);
    const tree = repo.addWorktree("pr-b", "feat/pr-b");
    writeSpec(tree, BOARD_ON, [PHASES[0] as PhaseSpec, { id: "2", tasks: ["Alpha", ["Beta", true]] }]);
    tree.commitAll("tick Beta");
    const treeHead = tree.git("rev-parse", "HEAD");

    expect(await joinCommand(tree.dir, [SPEC, "--from-tree"], deps())).toBe(`join: recorded 1 tick from tree pr-b (2.2) at ${treeHead.slice(0, 7)}`);
    expect(onRecord(`specs/${SPEC}/phases/2.json`).tasks[1]).toMatchObject({ id: "2.2", done: true, evidence: treeHead, doneIn: "pr-b" });
    expect(await joinCommand(tree.dir, [SPEC, "--from-tree"], deps())).toBe("join: nothing in tree pr-b is ahead of the board");
  });

  test("a second run says already on the board and lands a missing banner", async () => {
    await joinIn(repo);
    repo.git("pull", "-q", "--no-rebase", "origin", "main");
    writeSpec(repo, BOARD_ON);
    repo.commitAll("someone drops the banner");
    repo.git("push", "-q", "origin", "main");

    expect(await joinIn(repo)).toMatch(new RegExp(`^join: ${SPEC} is already on the board · banner landed on main \\([0-9a-f]{7}\\)$`));
    expect(progressOnMain()).toContain(bannerLine("2026-11-11"));
    expect(await joinIn(repo)).toBe(`join: ${SPEC} is already on the board`);
    expect(recordLog()).toEqual([`record: join ${SPEC}`]);
  });

  test("the setting is read from the default branch, not the checkout", async () => {
    const stale = repo.clone("stale");
    const other = repo.clone("other");
    writeSpec(stale, "---\ndocs: main\n---\n");
    stale.commitAll("stale checkout says off");
    other.write(SETTINGS, BOARD_ON.replace("record: on", "record: off"));
    other.commitAll("main turns it off");
    other.git("push", "-q", "origin", "main");

    expect(await joinIn(stale)).toBe(`join: refused, nothing written. The board is off here: ${SETTINGS} on main doesn't say board.record: on.`);
    other.write(SETTINGS, BOARD_ON);
    other.commitAll("main turns it on");
    other.git("push", "-q", "origin", "main");
    expect(await joinIn(stale)).toStartWith(`join: ${SPEC} is on the board`);
  });

  test("refuses without docs: main and when origin can't be reached, writing nothing", async () => {
    const other = repo.clone("other");
    other.write(SETTINGS, "---\ndocs: branch\nboard: { record: on }\n---\n");
    other.commitAll("docs on branch");
    other.git("push", "-q", "origin", "main");
    expect(await joinIn(repo)).toBe("join: refused, nothing written. The board needs docs: main in this version.");

    repo.git("remote", "set-url", "origin", join(repo.root, "gone.git"));
    expect(await joinIn(repo)).toStartWith("join: refused, nothing written. Can't reach origin (");
    repo.git("remote", "set-url", "origin", repo.origin);
    expect(repo.git("--git-dir", repo.origin, "for-each-ref", "refs/spec-board")).toBe("");
  });

  test("two clones joining at once leave one record", async () => {
    const a = repo.clone("a");
    const b = repo.clone("b");
    const specTs = join(import.meta.dir, "..", "spec.ts");
    let raced = "";
    const racing: Runner = {
      run(argv, options) {
        if (!raced && argv[1] === "push" && argv.some((arg) => arg.endsWith(`:${RECORD_REF}`))) {
          raced = isolatedRunner.run(["bun", specTs, "join", SPEC], { cwd: a.dir }).stdout.trim();
        }
        return isolatedRunner.run(argv, options);
      },
    };

    expect(await joinIn(b, racing)).toStartWith(`join: ${SPEC} is already on the board`);
    expect(raced).toStartWith(`join: ${SPEC} is on the board`);
    expect(recordLog()).toEqual([`record: join ${SPEC}`]);
  });
});
