import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { contextPack } from "../commands/context";
import { doctorReport } from "../commands/doctor";
import { readyReport } from "../commands/ready";
import { gitAt } from "../core/git";
import type { Runner } from "../core/run";
import { resolveSpec } from "../core/spec-folders";
import { issuesForWrittenFile } from "../hooks/spec-file-check";
import { specStatesAt } from "../plan/read-plans";
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
    repo.commitAll("alpha");
    repo.git("push", "-q", "origin", "main");
    const port = gitRecordPort(gitAt(repo.dir, isolatedRunner));
    if (!port) throw new Error("no origin");
    const docs = {
      [specDocPath("alpha")]: specDoc({ name: "alpha", phases: ["1", "2"] }),
      [phaseDocPath("alpha", "1")]: phaseDoc({ id: "1", file: "phases/phase-1.md", tasks: [task({ id: "1.1", text: "first", done: true })] }),
      [phaseDocPath("alpha", "2")]: phaseDoc({ id: "2", file: "phases/phase-2.md", needs: ["1"], tasks: [task({ id: "2.1", text: "second" })] }),
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
});
