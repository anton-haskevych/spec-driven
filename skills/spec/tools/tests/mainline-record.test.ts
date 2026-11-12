import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import type { Runner } from "../core/run";
import { loadMainline } from "../mainline/load";
import { serializeDoc } from "../record/document";
import { RECORD_REF } from "../record/layout";
import { gitRecordPort } from "../record/ref";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import { phaseDoc, specDoc, task } from "./record-factories";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const NOW = new Date("2026-11-11T20:00:00Z");
const SPECS = 40;
const BOARD_ON = "---\ndocs: main\nboard:\n  record: on\n---\n";

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

describe("the board's base reads joined specs from the record (real git)", () => {
  let repo: TestRepo;

  beforeAll(() => {
    repo = repoWithOrigin("spec-mainline-record-");
    for (let n = 1; n <= SPECS; n++) {
      repo.write(`docs/specs/s${n}/CLAUDE.md`, "---\nstatus: active\n---\n");
      repo.write(`docs/specs/s${n}/progress.md`, "- [x] Phase 1 — One → `phases/phase-1.md`\n");
      repo.write(`docs/specs/s${n}/phases/phase-1.md`, "# Phase 1\n\n## Deliverables\n\n- [x] frozen\n");
    }
    repo.commitAll("specs");
    repo.git("push", "-q", "origin", "main");

    const port = gitRecordPort(gitAt(repo.dir, isolatedRunner));
    if (!port) throw new Error("no origin");
    const docs = {
      [specDocPath("s1")]: specDoc({ name: "s1" }),
      [phaseDocPath("s1", "1")]: phaseDoc({ id: "1", file: "phases/phase-1.md", tasks: [task({ id: "1.1", text: "live" })] }),
    };
    const commit = port.commit({ kind: "absent" }, Object.entries(docs).map(([path, doc]) => ({ path, text: serializeDoc(doc) })), "record: join s1");
    if (!commit.ok) throw new Error(commit.reason);
    port.push(commit.value, { kind: "absent" });
    repo.git("update-ref", "-d", "refs/spec-board-remote/record");
  });

  afterAll(() => repo.cleanup());

  function setBoard(settings: string): void {
    repo.write("docs/specs/_playbook/settings.md", settings);
    repo.commitAll("settings");
    repo.git("push", "-q", "origin", "main");
  }

  test("board off: no record fetch, every spec reads its files", async () => {
    const runner = counting();
    const result = await loadMainline(gitAt(repo.dir, runner), "main", { timeoutMs: 10_000, local: false, now: NOW });
    if (!result.ok) throw new Error(result.reason);
    expect(runner.recordFetches).toBe(0);
    expect(result.value.states.get("s1")?.phases[0]?.done).toBe(true);
  });

  test("board on: one fetch for 40 specs; the joined one reads the record, the rest their files", async () => {
    setBoard(BOARD_ON);
    const runner = counting();
    const result = await loadMainline(gitAt(repo.dir, runner), "main", { timeoutMs: 10_000, local: false, now: NOW });
    if (!result.ok) throw new Error(result.reason);
    const { states, nodes, plans } = result.value;
    expect(runner.recordFetches).toBe(1);
    expect(plans.record.kind).toBe("read");

    const joined = states.get("s1")?.phases[0];
    expect([joined?.done, joined?.entry?.includes("- [ ] 1.1 live"), joined?.entry?.includes("frozen")]).toEqual([false, true, false]);
    expect(nodes.get("s1")?.phases).toEqual([{ id: "1", done: false, deployed: false }]);
    expect(states.get("s2")?.phases[0]?.done).toBe(true);
    expect(nodes.get("s2")?.phases[0]?.done).toBe(true);
  });
});
