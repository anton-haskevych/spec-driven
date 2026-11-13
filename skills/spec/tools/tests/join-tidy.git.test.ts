import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { joinCommand, type JoinDeps } from "../commands/join";
import { ON_BOARD } from "../phases/template";
import { manualReadLine } from "../plan/banner";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";
import { specFiles, SPEC, type PhaseSpec } from "./join-fixtures";

const SPEC_DIR = `docs/specs/${SPEC}`;
const PHASES: PhaseSpec[] = [
  { id: "1", done: true, tasks: [["One", true]] },
  { id: "2", edges: "needs: [1]\npr: B", tasks: ["Alpha", "Beta"] },
];
const NOW = new Date("2026-11-12T12:00:00Z");

function writeSpec(copy: WorkingCopy): void {
  copy.write("docs/specs/_playbook/settings.md", "---\ndocs: main\nboard:\n  record: on\n---\n");
  copy.write(`${SPEC_DIR}/CLAUDE.md`, "---\nstatus: active\n---\n# Spec\n");
  for (const [path, text] of specFiles(PHASES)) copy.write(`${SPEC_DIR}/${path}`, text);
}

describe("spec.ts join --tidy (real git)", () => {
  let repo: TestRepo;
  const deps: JoinDeps = { runner: isolatedRunner, asyncRunner: isolatedAsyncRunner, now: () => NOW };
  const tidy = (copy: WorkingCopy = repo) => joinCommand(copy.dir, [SPEC, "--tidy"], deps);
  const onMain = (path: string) => repo.git("--git-dir", repo.origin, "show", `main:${SPEC_DIR}/${path}`);
  const mainLog = () => repo.git("--git-dir", repo.origin, "log", "--format=%s", "main").split("\n");

  beforeEach(async () => {
    repo = repoWithOrigin("spec-tidy-");
    writeSpec(repo);
    repo.commitAll("spec");
    repo.git("push", "-q", "origin", "main");
    expect(await joinCommand(repo.dir, [SPEC], deps)).toStartWith(`join: ${SPEC} is on the board`);
  });

  afterEach(() => repo.cleanup());

  test("one commit on main leaves the stub and phase files without boxes or edges; the checkout is untouched", async () => {
    const head = repo.git("rev-parse", "HEAD");
    expect(await tidy()).toMatch(new RegExp(`^join: tidied ${SPEC} on main \\([0-9a-f]{7}\\): 3 files$`));
    expect(onMain("progress.md")).toBe(`# Progress\n\n> On the board since 2026-11-12. This list is frozen; the board is the source.\n${manualReadLine(SPEC)}`);
    expect(onMain("phases/phase-2.md")).not.toContain("needs:");
    expect(onMain("phases/phase-2.md")).not.toContain("- [ ]");
    expect(onMain("phases/phase-2.md")).toContain(ON_BOARD);
    expect(mainLog()[0]).toBe(`[board] ${SPEC}: the plan lives on the board`);
    expect(repo.git("rev-parse", "HEAD")).toBe(head);
    expect(repo.git("status", "--porcelain")).toBe("");

    expect(await tidy()).toBe(`join: ${SPEC} is already tidy`);
  });

  test("a worktree that changed a phase file holds that file only", async () => {
    repo.git("pull", "-q", "--no-rebase", "origin", "main");
    const tree = repo.addWorktree("pr-b", "feat/pr-b");
    tree.write(`${SPEC_DIR}/phases/phase-2.md`, `${onMain("phases/phase-2.md")}\nMore prose.\n`);

    const output = await tidy();
    expect(output).toMatch(new RegExp(`^join: tidied ${SPEC} on main \\([0-9a-f]{7}\\): 2 files · left phases/phase-2.md \\(tree pr-b\\): run join ${SPEC} --tidy again once that work has merged$`));
    expect(onMain("phases/phase-2.md")).toContain("- [ ] Alpha");
    expect(onMain("phases/phase-1.md")).toContain(ON_BOARD);
  });

  test("a remote branch of the spec, pushed from another machine, holds the files it changed", async () => {
    const other = repo.clone("other");
    other.git("checkout", "-q", "-b", `feat/${SPEC}-pr-c`);
    other.write(`${SPEC_DIR}/phases/phase-1.md`, "# Phase 1 — changed elsewhere\n\n- [x] One\n");
    other.commitAll("work on the other machine");
    other.git("push", "-q", "origin", `feat/${SPEC}-pr-c`);

    expect(await tidy()).toContain(`left phases/phase-1.md (branch origin/feat/${SPEC}-pr-c)`);
    expect(onMain("phases/phase-1.md")).toContain("- [x] One");
    expect(onMain("progress.md")).toContain(manualReadLine(SPEC));
  });

  test("a spec that is not on the board is refused", async () => {
    expect(await joinCommand(repo.dir, ["other-spec", "--tidy"], deps)).toBe("join: refused, nothing written. other-spec is not on the board; only a joined spec is tidied.");
  });
});
