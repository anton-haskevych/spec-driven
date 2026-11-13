import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { phaseCommand } from "../commands/phase";
import { questionCommand } from "../commands/question";
import { isolatedRunner, type TestRepo, type WorkingCopy } from "./git-repo";
import { joinedRepo, recordPhase } from "./joined-repo";
import { phaseDoc, task } from "./record-factories";

const NOW = new Date("2026-11-13T10:00:00+00:00");
const REAL_GIT_MS = 30_000;

describe("question ask, list and answer on the board (real git)", () => {
  let repo: TestRepo;
  let tree: WorkingCopy;
  const run = (...args: string[]) => Promise.resolve(questionCommand(tree.dir, args, undefined, { runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: "s1" }, now: () => NOW }));

  beforeAll(() => {
    repo = joinedRepo("spec-question-");
    tree = repo.clone("pr-a");
  });
  afterAll(() => repo.cleanup());

  test("a question asked on a phase is listed, answered once by id, and then off the open list", async () => {
    expect(await run("ask", "alpha", "3", "Ship today?", "--recommend", "yes")).toContain('question: q1 open on phase 3 — "Ship today?" · recommend: yes\nHand off');
    expect(await run("list")).toBe('q1 · alpha · phase 3 — "Ship today?" · recommend: yes · asked 2026-11-13T10:00:00+00:00 by s1\nquestion: 1 open across 1 spec');
    const answered = await run("answer", "alpha", "q1", "yes, today");
    expect(answered).toMatch(/question: q1 answered on phase 3: "yes, today" \(.+\)$/);
    expect(await run("answer", "alpha", "q1", "no")).toEndWith('question answer: q1 was answered 2026-11-13T10:00:00+00:00 by spec-tests: "yes, today"');
    expect(await run("list")).toBe("question: none open on the board");
    expect(await run("list", "--all")).toContain('· answered 2026-11-13T10:00:00+00:00 by ');
  }, REAL_GIT_MS);

  test("an answer read at an older version of the question is refused", async () => {
    expect(await run("ask", "alpha", "2", "Which copy?")).toContain('question: q2 open on phase 2 — "Which copy?"');
    expect(await run("answer", "alpha", "q2", "the short one", "--if-version", "0".repeat(40))).toStartWith("answer: refused, nothing written. specs/alpha/questions/q2.json changed while it was written");
  }, REAL_GIT_MS);

  test("an answer by phase is phase unpark", async () => {
    expect(await run("answer", "alpha", "2", "the short one")).toMatch(/^question: q2 answered on phase 2: "the short one"/m);
  }, REAL_GIT_MS);
});

describe("a Gate: task parked, answered and ticked on the board (real git)", () => {
  let repo: TestRepo;
  let tree: WorkingCopy;
  const deps = () => ({ runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: "s2" }, now: () => NOW });
  const phase = (...args: string[]) => Promise.resolve(phaseCommand(tree.dir, args, undefined, deps()));

  beforeAll(() => {
    repo = joinedRepo("spec-question-gate-", [
      phaseDoc({ id: "4", file: "phases/phase-4.md", gate: "design", tasks: [task({ id: "4.1", text: "Gate: design agreed with Anton", gate: true }), task({ id: "4.2", text: "build" })] }),
    ]);
    tree = repo.clone("pr-a");
  });
  afterAll(() => repo.cleanup());

  test("the park asks a gate question; the tick takes its evidence from the answer", async () => {
    expect(await phase("tick", "alpha", "4", "4.1")).toEndWith('phase tick: "Gate: design agreed with Anton" records an approval; answer its gate question (phase unpark) or tick it with --evidence "<who approved, when>"');
    expect(await phase("park", "alpha", "4", "Is the design agreed?", "--recommend", "yes")).toContain('question: q1 open on phase 4 — "Is the design agreed?" · recommend: yes');
    expect(await phase("unpark", "alpha", "4", "agreed, go")).toContain('question: q1 answered on phase 4: "agreed, go"');
    expect(await phase("tick", "alpha", "4", "4.1")).toEndWith('tick: phase 4 · 4.1 done ("agreed, go" — spec-tests, 2026-11-13T10:00:00+00:00)');
    expect(recordPhase(repo, "4").tasks[0]).toMatchObject({ done: true, evidence: '"agreed, go" — spec-tests, 2026-11-13T10:00:00+00:00' });
  }, REAL_GIT_MS);
});
