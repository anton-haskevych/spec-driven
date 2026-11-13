import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { phaseCommand } from "../commands/phase";
import { recordCommand, systemRecordDeps } from "../commands/record";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import type { SpecDoc } from "../plan/docs/spec-doc";
import { specDocPath } from "../plan/kinds";
import { isolatedRunner, type TestRepo, type WorkingCopy } from "./git-repo";
import { joinedRepo, recordPhase } from "./joined-repo";
import { phaseDoc, task } from "./record-factories";

const NOW = new Date("2026-11-12T10:00:00Z");
// Every command is a fetch and a record push against a local origin, about a second apiece on a loaded Mac.
const REAL_GIT_MS = 30_000;

const PHASES: PhaseDoc[] = [
  phaseDoc({ id: "1", file: "phases/phase-1.md", tasks: [task({ id: "1.1", text: "base", done: true })] }),
  phaseDoc({ id: "2", file: "phases/phase-2.md", needs: ["1"], tasks: [task({ id: "2.1", text: "one" }), task({ id: "2.2", text: "two" })] }),
  phaseDoc({ id: "3", file: "phases/phase-3.md", needs: ["2"], tasks: [task({ id: "3.1", text: "three" })] }),
  phaseDoc({ id: "5", file: "phases/phase-5.md", needs: ["2"], tasks: [task({ id: "5.1", text: "five" })] }),
];

function session(copy: WorkingCopy, id: string) {
  const deps = { runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: id }, now: () => NOW };
  return (...args: string[]) => Promise.resolve(phaseCommand(copy.dir, args, undefined, deps));
}

function recordSpec(repo: TestRepo): SpecDoc {
  repo.git("fetch", "-q", "origin", "+refs/spec-board/record:refs/spec-board-remote/record");
  return JSON.parse(repo.git("show", `refs/spec-board-remote/record:${specDocPath("alpha")}`)) as SpecDoc;
}

describe("plan changes from two clones at once (real git)", () => {
  let repo: TestRepo;
  let a: ReturnType<typeof session>;
  let b: ReturnType<typeof session>;

  beforeAll(() => {
    repo = joinedRepo("spec-record-plan-", PHASES);
    a = session(repo.clone("pr-a"), "sa");
    b = session(repo.clone("pr-b"), "sb");
  });
  afterAll(() => repo.cleanup());

  test("one adds a phase while the other moves a task between two other phases: both land", async () => {
    const [added, moved] = await Promise.all([a("add", "alpha", "Polish", "--needs", "5", "--task", "copy"), b("move", "alpha", "2.2", "--to", "3")]);
    expect(added).toStartWith("add: phase 6 — Polish → phases/phase-6-polish.md · 1 task (plan v");
    expect(moved).toStartWith("move: 2.2 → phase 3 (plan v");
    expect(recordSpec(repo)).toMatchObject({ phases: ["1", "2", "3", "5", "6"], planVersion: 3 });
    expect(recordPhase(repo, "3").tasks.map((t) => t.id)).toEqual(["3.1", "2.2"]);
    expect(recordPhase(repo, "6").tasks).toEqual([task({ id: "6.1", text: "copy" })]);
  }, REAL_GIT_MS);

  test("one adds 5→3 while the other adds 3→5: the second is refused as a cycle", async () => {
    const results = await Promise.all([a("set", "alpha", "5", "--needs", "2,3"), b("set", "alpha", "3", "--needs", "2,5")]);
    const landed = results.filter((line) => line.startsWith("set: phase"));
    const refused = results.filter((line) => line.includes("needs cycle"));
    expect([landed.length, refused.length]).toEqual([1, 1]);
    expect(refused[0]).toMatch(/^(set: refused, nothing written\.|phase set:) needs cycle: (3 → 5 → 3|5 → 3 → 5)$/);
    expect([recordPhase(repo, "3").needs, recordPhase(repo, "5").needs]).toContainEqual(["2"]);
  }, REAL_GIT_MS);
});

describe("plan changes while origin is unreachable (real git)", () => {
  let repo: TestRepo;
  let tree: WorkingCopy;
  let run: ReturnType<typeof session>;

  beforeAll(() => {
    repo = joinedRepo("spec-record-plan-offline-", PHASES);
    tree = repo.clone("pr-a");
    tree.git("fetch", "-q", "origin", "+refs/spec-board/record:refs/spec-board-remote/record");
    run = session(tree, "s-offline");
  });
  afterAll(() => repo.cleanup());

  test("each command is kept here with the pending count, reads build on the queue, and one sync sends them all", async () => {
    tree.git("remote", "set-url", "origin", join(repo.root, "nowhere.git"));
    const kept = (action: string, n: number) => `${action}: kept on this machine (origin unreachable); ${n} ${n === 1 ? "change" : "changes"} not shared yet`;
    expect(await run("add", "alpha", "Polish", "--task", "copy")).toBe(kept("add", 1));
    expect(existsSync(join(tree.dir, "docs/specs/alpha/phases/phase-6-polish.md"))).toBe(true);
    expect(await run("split", "alpha", "3", "Rest", "--items", "b:1")).toBe(kept("split", 2));
    expect(await run("move", "alpha", "2.2", "--to", "6")).toBe(kept("move", 3));
    expect(await run("set", "alpha", "5", "--pr", "C")).toBe(kept("set", 4));
    expect(await run("deployed", "alpha", "1", "--date", "2026-11-12")).toBe(kept("deployed", 5));
    expect(await run("park", "alpha", "5", "Ship today?", "--recommend", "yes")).toBe(kept("park", 6));
    expect(await run("unpark", "alpha", "5", "yes")).toBe(kept("unpark", 7));

    tree.git("remote", "set-url", "origin", repo.origin);
    const sync = await recordCommand(tree.dir, ["sync"], { ...systemRecordDeps(), runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: "s-offline" }, now: () => NOW });
    expect(sync).toContain("sent 7 · nothing queued");
    expect(recordSpec(repo)).toMatchObject({ phases: ["1", "2", "3", "3a", "5", "6"], planVersion: 5 });
    expect(recordPhase(repo, "3a").tasks.map((t) => t.id)).toEqual(["3.1"]);
    expect(recordPhase(repo, "6").tasks.map((t) => t.id)).toEqual(["6.1", "2.2"]);
    expect(recordPhase(repo, "1").deployed).toBe("2026-11-12");
    expect(recordPhase(repo, "5")).toMatchObject({ pr: "C", parks: [{ question: "Ship today?", recommend: "yes", answer: { text: "yes" } }] });
  }, REAL_GIT_MS * 2);
});
