import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { contextPack } from "../commands/context";
import { phaseCommand } from "../commands/phase";
import { doctorReport } from "../commands/doctor";
import { readyReport } from "../commands/ready";
import { gitAt } from "../core/git";
import type { Runner } from "../core/run";
import { resolveSpec } from "../core/spec-folders";
import { isFinished, loadNodes } from "../graph/nodes";
import { issuesForWrittenFile } from "../hooks/spec-file-check";
import { readLocalPlans, specStatesAt } from "../plan/read-plans";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import { serializeDoc } from "../record/document";
import { RECORD_REF } from "../record/layout";
import { gitRecordPort } from "../record/ref";
import { contextDeps } from "./context-fixture";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { phaseDoc, specDoc, task } from "./record-factories";

const NOW = new Date("2026-11-11T20:00:00Z");
const STUB = "> On the board since 2026-11-11. This list is frozen; the board is the source.\n";

function counting(): Runner & { recordFetches: number } {
  const runner = {
    recordFetches: 0,
    run: (argv: readonly string[], options?: Parameters<Runner["run"]>[1]) => {
      if (argv.includes("fetch") && argv.some((arg) => arg.includes(RECORD_REF))) runner.recordFetches += 1;
      return isolatedRunner.run(argv, options);
    },
  };
  return runner;
}

describe("one-spec readers of a joined spec (real git)", () => {
  let repo: TestRepo;
  const spec = (path: string) => join(repo.dir, "docs/specs/alpha", path);

  beforeAll(() => {
    repo = repoWithOrigin("spec-record-readers-");
    repo.write("docs/specs/_playbook/settings.md", "---\ndocs: main\nboard:\n  record: on\n---\n");
    repo.write("docs/specs/alpha/CLAUDE.md", "---\nstatus: active\n---\n# Alpha\n");
    repo.write("docs/specs/alpha/progress.md", STUB);
    repo.write("docs/specs/alpha/ledger/INDEX.md", "# Ledger\n");
    repo.write("docs/specs/alpha/phases/phase-1.md", "# Phase 1\n\n**Goal:** one.\n\n## Deliverables\n\n- [x] frozen\n");
    repo.write("docs/specs/alpha/phases/phase-2.md", "# Phase 2\n\n**Goal:** two.\n\n## Deliverables\n\n- [ ] frozen two\n");
    repo.write("docs/specs/beta/CLAUDE.md", "---\nstatus: active\n---\n# Beta\n");
    repo.write("docs/specs/beta/progress.md", "- [ ] Phase 1 — Use → `phases/phase-1.md`\n");
    repo.write("docs/specs/beta/phases/phase-1.md", "---\nneeds: [alpha#1]\n---\n- [ ] use alpha\n");
    repo.write("docs/specs/gamma/CLAUDE.md", "---\nstatus: active\n---\n# Gamma\n");
    repo.write("docs/specs/gamma/progress.md", STUB);
    repo.write("docs/specs/gamma/phases/phase-1.md", "# Phase 1\n\n## Deliverables\n\n- [ ] frozen\n");
    repo.commitAll("alpha");
    repo.git("push", "-q", "origin", "main");
    const port = gitRecordPort(gitAt(repo.dir, isolatedRunner));
    if (!port) throw new Error("no origin");
    const docs = {
      [specDocPath("alpha")]: specDoc({ name: "alpha", phases: ["1", "2"] }),
      [phaseDocPath("alpha", "1")]: phaseDoc({ id: "1", file: "phases/phase-1.md", tasks: [task({ id: "1.1", text: "first", done: true })] }),
      [phaseDocPath("alpha", "2")]: phaseDoc({ id: "2", file: "phases/phase-2.md", needs: ["1"], tasks: [task({ id: "2.1", text: "second" })] }),
      [specDocPath("gamma")]: specDoc({ name: "gamma", phases: ["1"] }),
      [phaseDocPath("gamma", "1")]: phaseDoc({ id: "1", file: "phases/phase-1.md", tasks: [task({ id: "1.1", text: "only", done: true })] }),
    };
    const commit = port.commit({ kind: "absent" }, Object.entries(docs).map(([path, doc]) => ({ path, text: serializeDoc(doc) })), "record: join alpha");
    if (!commit.ok) throw new Error(commit.reason);
    port.push(commit.value, { kind: "absent" });
  });

  afterAll(() => repo.cleanup());

  test("the pack of a joined spec with a stub progress.md reads the record, fetching once", async () => {
    const runner = counting();
    const pack = await contextPack(repo.dir, { mode: "execute", name: "alpha" }, contextDeps({ runner, now: () => NOW }));
    expect(pack).toContain("Phase 2");
    expect(pack).toContain("- [ ] 2.1 second");
    expect(pack).not.toContain("frozen two");
    expect(pack.split("\n")[1]).toBe("Board: live · plan v1");
    expect(runner.recordFetches).toBe(1);
  });

  test("ready reads the joined spec's phases from the record", () => {
    expect(readyReport(repo.dir, "alpha", isolatedRunner, NOW)).toBe("Ready now: 2 Phase 2\n\nPR (no pr field): phases 1 ✓, 2");
  });

  test("the doctor and the spec-file hook never fetch, and skip the frozen progress.md", () => {
    const runner = counting();
    const report = doctorReport(repo.dir, "alpha", runner);
    expect(issuesForWrittenFile(spec("phases/phase-2.md"), repo.dir, runner)).toEqual([]);
    expect(runner.recordFetches).toBe(0);
    expect(report).not.toContain("progress.md");
  });

  test("a lazy spec source reads the record on the first spec asked for, never before", () => {
    const runner = counting();
    const states = specStatesAt(repo.dir, runner, NOW);
    expect(runner.recordFetches).toBe(0);
    const alpha = resolveSpec(repo.dir, "alpha");
    if (typeof alpha === "string") throw new Error(alpha);
    expect(states(alpha).phases[1]?.entry).toContain("- [ ] 2.1 second");
    states(alpha);
    expect(runner.recordFetches).toBe(1);
  });

  test("a spec that needs a joined spec's finished phase is unblocked by the record's marks", () => {
    expect(readyReport(repo.dir, "beta", isolatedRunner, NOW)).toStartWith("Ready now: 1 Use");
  });

  test("a joined spec whose record tasks are all done is finished, though its progress.md is a stub", () => {
    const nodes = loadNodes(repo.dir, readLocalPlans(repo.dir, isolatedRunner, NOW).marks);
    expect(nodes.get("gamma")?.phases).toEqual([{ id: "1", done: true, deployed: false }]);
    expect(isFinished(nodes.get("gamma")!)).toBe(true);
    expect(isFinished(loadNodes(repo.dir).get("gamma")!)).toBe(false);
  });

  test("a tick and a move name tasks by id on a joined spec, and the files stay alone", async () => {
    const before = readFileSync(spec("phases/phase-2.md"), "utf8");
    expect(await phaseCommand(repo.dir, ["tick", "alpha", "2", "#1"])).toBe('phase tick: no task "#1" in phase 2; alpha is on the board, where a task is named by its id. Open tasks:\n2.1 second');
    expect(await phaseCommand(repo.dir, ["move", "alpha", "9.9", "--to", "2"])).toBe("phase move: no task 9.9 in alpha");
    expect(readFileSync(spec("phases/phase-2.md"), "utf8")).toBe(before);
  });

  test("the spec-file hook blocks a hand tick in a joined spec, not a prose edit", () => {
    const path = spec("phases/phase-2.md");
    const before = readFileSync(path, "utf8");
    try {
      writeFileSync(path, before.replace("**Goal:** two.", "**Goal:** two, reworded."));
      expect(issuesForWrittenFile(path, repo.dir, isolatedRunner)).toEqual([]);
      writeFileSync(path, before.replace("- [ ] frozen two", "- [x] frozen two"));
      expect(issuesForWrittenFile(path, repo.dir, isolatedRunner)).toEqual([
        expect.objectContaining({ severity: "error", problem: expect.stringContaining("alpha is on the board: its checkboxes live in the record") }),
      ]);
      writeFileSync(spec("progress.md"), `${STUB}- [x] Phase 1 — One → \`phases/phase-1.md\`\n`);
      expect(issuesForWrittenFile(spec("progress.md"), repo.dir, isolatedRunner)).toEqual([
        expect.objectContaining({ problem: expect.stringContaining("its phase list lives") }),
      ]);
    } finally {
      writeFileSync(path, before);
      writeFileSync(spec("progress.md"), STUB);
    }
  });
});
