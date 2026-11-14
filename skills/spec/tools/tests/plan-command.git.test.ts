import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { JoinDeps } from "../commands/join";
import { planCommand } from "../commands/plan";
import { manualReadLine } from "../plan/banner";
import { RECORD_REF } from "../record/layout";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const SETTINGS = "docs/specs/_playbook/settings.md";
const BOARD_ON = "---\ndocs: main\nboard:\n  record: on\n---\n";
const NOW = new Date("2026-11-12T12:00:00Z");
const DRAFT = {
  phases: [
    { id: "1", title: "Schema", outcome: "The schema exists.", file: "phases/phase-1-schema.md", needs: [], pr: "A", tasks: ["Write it", "Test it"] },
    { id: "2", title: "API", outcome: "Clients can call it.", file: "phases/phase-2-api.md", needs: ["1"], pr: "A", tasks: ["Route"] },
  ],
};

describe("spec.ts plan apply (real git)", () => {
  let repo: TestRepo;
  let draftFile: string;
  const deps: JoinDeps = { runner: isolatedRunner, asyncRunner: isolatedAsyncRunner, now: () => NOW };
  const apply = () => planCommand(repo.dir, ["apply", "beta", "--file", draftFile], deps);
  const onRecord = (path: string) => JSON.parse(repo.git("--git-dir", repo.origin, "show", `${RECORD_REF}:${path}`));

  beforeEach(() => {
    repo = repoWithOrigin("spec-plan-apply-");
    repo.write(SETTINGS, BOARD_ON);
    repo.commitAll("settings");
    repo.git("push", "-q", "origin", "main");
    repo.write("docs/specs/beta/CLAUDE.md", "---\nstatus: draft\n---\n# Beta\n");
    for (const phase of DRAFT.phases) repo.write(`docs/specs/beta/${phase.file}`, `# Phase ${phase.id}\n`);
    draftFile = join(repo.root, "draft.json");
    writeFileSync(draftFile, JSON.stringify(DRAFT));
  });

  afterEach(() => repo.cleanup());

  test("writes the new spec's plan in one record commit and a stub progress.md in the tree", async () => {
    expect(await apply()).toBe("plan: beta is on the board (2 phases, 3 tasks) · progress.md written");
    expect(onRecord("specs/beta/spec.json")).toMatchObject({ name: "beta", planVersion: 1, phases: ["1", "2"], joinedFrom: repo.git("rev-parse", "HEAD") });
    expect(onRecord("specs/beta/phases/1.json").tasks).toEqual([{ id: "1.1", text: "Write it", done: false }, { id: "1.2", text: "Test it", done: false }]);
    expect(repo.git("--git-dir", repo.origin, "log", "--format=%s", RECORD_REF)).toBe("record: plan beta");
    expect(readFileSync(join(repo.dir, "docs/specs/beta/progress.md"), "utf8")).toContain(manualReadLine("beta"));
    expect(await apply()).toBe("plan: refused, nothing written. beta already has progress.md: a spec on files goes on the board with join beta.");
  });

  test("refuses a draft with problems, missing phase files, or the board off, writing nothing", async () => {
    writeFileSync(draftFile, JSON.stringify({ phases: [{ ...DRAFT.phases[0], needs: ["7"] }] }));
    expect(await apply()).toBe("plan: refused, nothing written. The draft has problems: phase 1 needs 7, which is not a phase of beta.");
    writeFileSync(draftFile, JSON.stringify({ phases: [{ ...DRAFT.phases[0], file: "phases/phase-1-other.md" }] }));
    expect(await apply()).toBe("plan: refused, nothing written. Write the phase files first: phases/phase-1-other.md.");
    repo.write(SETTINGS, "---\ndocs: main\n---\n");
    repo.commitAll("board off");
    repo.git("push", "-q", "origin", "main");
    writeFileSync(draftFile, JSON.stringify(DRAFT));
    expect(await apply()).toBe(`plan: refused, nothing written. The board is off here: ${SETTINGS} on main doesn't say board.record: on.`);
    expect(repo.git("--git-dir", repo.origin, "for-each-ref", "refs/spec-board")).toBe("");
  });

  test("usage", async () => {
    expect(await planCommand(repo.dir, ["apply", "beta"], deps)).toBe("usage: plan apply <spec> --file <draft.json>");
  });
});
