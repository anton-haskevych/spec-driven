import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { phaseCommand } from "../commands/phase";
import type { WorkingCopy } from "./git-repo";
import { isolatedRunner, type TestRepo } from "./git-repo";
import { joinedRepo, recordPhase } from "./joined-repo";
import { phaseDoc, task } from "./record-factories";

const NOW = new Date("2026-11-12T10:00:00Z");
// Each tick is a push and a record write against a local origin: about a second apiece on a loaded Mac.
const REAL_GIT_MS = 30_000;

function session(copy: WorkingCopy, id: string) {
  const deps = { runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: id }, now: () => NOW };
  return {
    copy,
    work(file: string) {
      copy.write(`src/${file}.ts`, `${file}\n`);
      copy.commitAll(file);
      return copy.git("rev-parse", "HEAD");
    },
    tick: (phase: string, task: string, ...flags: string[]) => phaseCommand(copy.dir, ["tick", "alpha", phase, task, ...flags], undefined, deps),
  };
}

describe("phase tick on a joined spec (real git)", () => {
  let repo: TestRepo;
  let a: ReturnType<typeof session>;
  let b: ReturnType<typeof session>;

  beforeAll(() => {
    repo = joinedRepo("spec-record-tick-");
    a = session(repo.clone("pr-a"), "sa");
    b = session(repo.clone("pr-b"), "sb");
    a.copy.git("checkout", "-q", "-b", "feat/alpha-pr-a");
    b.copy.git("checkout", "-q", "-b", "feat/alpha-pr-b");
  });

  afterAll(() => repo.cleanup());

  test("two machines tick the same phase and the next one, and all four land (the Nov 11 case)", async () => {
    const shaA = a.work("a1");
    expect(await a.tick("2", "2.3")).toBe(`tick: phase 2 · 2.3 done (${shaA.slice(0, 7)} on origin/feat/alpha-pr-a)`);
    const shaB = b.work("b1");
    expect(await b.tick("2", "2.4")).toBe(`tick: phase 2 · 2.4 done (${shaB.slice(0, 7)} on origin/feat/alpha-pr-b)`);
    a.work("a2");
    expect(await a.tick("2", "2.5")).toStartWith("tick: phase 2 · 2.5 done");
    b.work("b2");
    expect(await b.tick("3", "3.1")).toStartWith("tick: phase 3 · 3.1 done");

    expect(recordPhase(repo, "2").tasks.map((task) => [task.id, task.done, task.doneIn])).toEqual([["2.3", true, "pr-a"], ["2.4", true, "pr-b"], ["2.5", true, "pr-a"]]);
    expect(recordPhase(repo, "2").tasks[0]?.evidence).toBe(`${shaA} on origin/feat/alpha-pr-a`);
    expect(recordPhase(repo, "3").tasks[0]).toMatchObject({ id: "3.1", done: true, doneBy: "sb" });
    expect(repo.git("--git-dir", repo.origin, "rev-parse", "refs/heads/feat/alpha-pr-a")).toBe(a.copy.git("rev-parse", "HEAD"));
  }, REAL_GIT_MS);

  test("each sees the other's tick on its next command: the same task refuses with who and when", async () => {
    expect(await a.tick("2", "2.4")).toMatch(/^tick: refused, nothing written\. 2\.4 was closed <1m ago by the session in tree pr-b \([0-9a-f]{7}\)\.$/);
  }, REAL_GIT_MS);

  test("a repeat by the same session says already done", async () => {
    expect(await a.tick("2", "2.3")).toMatch(/^tick: 2\.3 is already done \([0-9a-f]{7} on origin\/feat\/alpha-pr-a\)$/);
  }, REAL_GIT_MS);

  test("edited code not in the commit is named; the tick still lands", async () => {
    a.work("a3");
    a.copy.write("src/loose.ts", "not committed\n");
    expect(await a.tick("3", "3.2")).toEndWith("· 1 edited file is not in this commit\nPhase 3 complete — run update.md → Close the phase");
  }, REAL_GIT_MS);
});

describe("phase tick refusals before anything is written (real git)", () => {
  let repo: TestRepo;
  beforeAll(() => {
    repo = joinedRepo("spec-record-tick-refuse-", [
      phaseDoc({ id: "2", file: "phases/phase-2.md", tasks: [task({ id: "2.3", text: "three" }), task({ id: "2.4", text: "Gate: design agreed with Anton", gate: true })] }),
    ]);
  });
  afterAll(() => repo.cleanup());

  test("a rejected push refuses the tick and the task stays open", async () => {
    const theirs = session(repo.clone("theirs"), "st");
    theirs.copy.git("checkout", "-q", "-b", "feat/alpha-pr-a");
    theirs.work("theirs");
    theirs.copy.git("push", "-q", "origin", "feat/alpha-pr-a");
    const mine = session(repo.clone("mine"), "sm");
    mine.copy.git("checkout", "-q", "-b", "feat/alpha-pr-a");
    mine.work("mine");
    expect(await mine.tick("2", "2.3")).toMatch(/^tick: refused, nothing written\. Couldn't push feat\/alpha-pr-a: .+\. Push it, then tick again\.$/);
    expect(recordPhase(repo, "2").tasks[0]?.done).toBe(false);
  }, REAL_GIT_MS);

  test("a Gate: task keeps the evidence rule and needs no push", async () => {
    const mine = session(repo.clone("gate"), "sg");
    expect(await mine.tick("2", "2.4")).toBe('phase tick: "Gate: design agreed with Anton" records an approval; answer its gate question (phase unpark) or tick it with --evidence "<who approved, when>"');
    expect(await mine.tick("2", "2.4", "--evidence", "Anton, 2026-11-12")).toBe("tick: phase 2 · 2.4 done (Anton, 2026-11-12)");
  }, REAL_GIT_MS);
});
