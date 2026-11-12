import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { joinCommand, type JoinDeps } from "../commands/join";
import { recordCommand, systemRecordDeps, type RecordDeps } from "../commands/record";
import { RECORD_REF } from "../record/layout";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { specFiles, SPEC, type PhaseSpec } from "./join-fixtures";

const SPEC_DIR = `docs/specs/${SPEC}`;
const PHASES: PhaseSpec[] = [
  { id: "1", done: true, tasks: [["One", true]] },
  { id: "2", edges: "needs: [1]\npr: B", tasks: ["Alpha", "Beta"] },
];
const NOW = new Date("2026-11-12T12:00:00Z");

describe("spec.ts record export (real git)", () => {
  let repo: TestRepo;
  const joinDeps: JoinDeps = { runner: isolatedRunner, asyncRunner: isolatedAsyncRunner, now: () => NOW };
  const deps: RecordDeps = { ...systemRecordDeps(), runner: isolatedRunner, env: {}, now: () => NOW };
  const exportSpec = (...flags: string[]) => recordCommand(repo.dir, ["export", SPEC, ...flags], deps);
  const inTree = (path: string) => readFileSync(join(repo.dir, SPEC_DIR, path), "utf8");
  const recordPaths = () => repo.git("--git-dir", repo.origin, "ls-tree", "-r", "--name-only", RECORD_REF);

  beforeEach(async () => {
    repo = repoWithOrigin("spec-export-");
    repo.write("docs/specs/_playbook/settings.md", "---\ndocs: main\nboard:\n  record: on\n---\n");
    repo.write(`${SPEC_DIR}/CLAUDE.md`, "---\nstatus: active\n---\n# Spec\n");
    for (const [path, text] of specFiles(PHASES)) repo.write(`${SPEC_DIR}/${path}`, text);
    repo.commitAll("spec");
    repo.git("push", "-q", "origin", "main");
    await joinCommand(repo.dir, [SPEC], joinDeps);
    await joinCommand(repo.dir, [SPEC, "--tidy"], joinDeps);
    repo.git("pull", "-q", "--no-rebase", "origin", "main");
  });

  afterEach(() => repo.cleanup());

  test("--unjoin writes the lists back into this tree and takes the spec off the record", async () => {
    expect(inTree("progress.md")).not.toContain("Phase 1");
    expect(await exportSpec("--unjoin")).toBe(`export: ${SPEC} written to files (2 phases, 3 tasks); off the board. Commit and publish these files: every tree reads them from now on`);
    expect(inTree("progress.md")).toContain("- [x] Phase 1 — P1 → `phases/phase-1.md`");
    expect(inTree("progress.md")).not.toContain("On the board");
    expect(inTree("phases/phase-2.md")).toContain("needs: [1]\npr: B");
    expect(inTree("phases/phase-2.md")).toContain("- [ ] Alpha\n- [ ] Beta");
    expect(recordPaths()).not.toContain(`specs/${SPEC}/`);

    repo.commitAll("back to files");
    repo.git("push", "-q", "origin", "main");
    expect(await joinCommand(repo.dir, [SPEC], joinDeps)).toStartWith(`join: ${SPEC} is on the board (2 phases, 3 tasks`);
  });

  test("without --unjoin the spec stays on the board", async () => {
    expect(await exportSpec()).toBe(`export: ${SPEC} written to files (2 phases, 3 tasks); still on the board`);
    expect(inTree("progress.md")).toContain("On the board since");
    expect(recordPaths()).toContain(`specs/${SPEC}/spec.json`);
  });

  test("a spec that is not on the board says so", async () => {
    await exportSpec("--unjoin");
    expect(await exportSpec()).toBe(`export: ${SPEC} is not on the board; its files already hold its plan`);
  });
});
