import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claimFile } from "../claims/store";
import { crewCheck } from "../commands/crew/check";
import { newRunFile, withLaunched } from "../crew/run-state";
import { liveSession } from "./factories";
import { agentsJson, claudeAnd, crewDeps } from "./crew-deps";
import { repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";

const CREW = "Crew: needs you 0 (in-flight.md) · say if wrong 1 · PR group ready A · next nothing · servers stopped none";
const turn = (text: string) =>
  [JSON.stringify({ type: "user", message: { content: "go" } }), JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text }] } })].join("\n");

describe("crew check", () => {
  let repo: TestRepo;
  let home: string;
  let tree: WorkingCopy;
  afterEach(() => {
    repo?.cleanup();
    rmSync(home, { recursive: true, force: true });
  });

  function setUp(title: string, lastTurn: string, launchedAt = "2000-01-01T00:00:00Z") {
    repo = repoWithOrigin("crew-check-");
    repo.write("README.md", "x\n");
    repo.commitAll("init");
    repo.git("push", "-q", "-u", "origin", "main");
    tree = repo.addWorktree("tree-a", "feat/checkout-pr-a");
    tree.write("a.ts", "a\n");
    tree.commitAll("[handoff] checkout: phase 1 done");
    tree.git("push", "-q", "-u", "origin", "feat/checkout-pr-a");
    const crew = join(repo.dir, ".git", "spec-board", "crew");
    mkdirSync(crew, { recursive: true });
    const run = newRunFile({ overseer: "own", runner: "anton-haskevych", started: "2026-10-12T20:00:00-07:00", caps: { workers: 1, babysitters: 1 } });
    writeFileSync(join(crew, "run.md"), withLaunched(run, [{ id: "f1a579ba", title, at: launchedAt }]));
    home = mkdtempSync(join(tmpdir(), "crew-home-"));
    mkdirSync(join(home, "projects", "-tree-a"), { recursive: true });
    writeFileSync(join(home, "projects", "-tree-a", "f1a579ba-0000.jsonl"), turn(lastTurn));
  }

  const deps = (extra: Parameters<typeof crewDeps>[0] = {}) =>
    crewDeps({ claudeHome: home, runner: claudeAnd([[["claude", "agents"], agentsJson([{ id: "f1a579ba", cwd: tree.dir, state: "done" }])]]), ...extra });

  function claim(phase: string, sessionId: string) {
    const dir = join(repo.dir, ".git", "spec-board", "claims");
    mkdirSync(dir, { recursive: true });
    writeFileSync(claimFile(dir, "checkout", phase), JSON.stringify({ spec: "checkout", phase, sessionId, workspace: tree.dir, branch: "feat/checkout-pr-a", claimedAt: "2026-10-12T20:00:00Z" }));
  }

  test("clean, pushed, handed off, claim released: ok with the Crew: line", () => {
    setUp("checkout execute 1", `Done.\n${CREW}\nHanded off.`);
    expect(crewCheck(repo.dir, ["f1a579ba"], deps())).toBe(`Close-out: ok · ${CREW}`);
  });

  test("a dirty tree, an unpushed commit and a live claim are each named", () => {
    setUp("checkout execute 1", CREW);
    tree.write("b.ts", "b\n");
    tree.commitAll("wip");
    tree.write("c.ts", "c\n");
    claim("1", "f1a579ba-0000");
    const result = crewCheck(repo.dir, ["f1a579ba"], deps({ sessions: [liveSession({ sessionId: "f1a579ba-0000" })] }));
    expect(result).toBe(`Close-out: missing uncommitted changes in ${tree.dir}, commits not on origin, claim still live`);
  });

  test("a [handoff] commit older than the launch doesn't count, nor does a last turn without the Crew: line", () => {
    setUp("checkout execute 1", "Stopped mid-unit.", new Date(Date.now() + 3_600_000).toISOString());
    expect(crewCheck(repo.dir, ["f1a579ba"], deps())).toBe("Close-out: missing no [handoff] commit since launch, no Crew: line");
  });

  test("a babysitter holding its PR claim is waiting, whatever the roster says", () => {
    setUp("checkout babysit A", "Waiting on CI.");
    claim("pr-A", "f1a579ba-0000");
    expect(crewCheck(repo.dir, ["f1a579ba"], deps({ sessions: [liveSession({ sessionId: "f1a579ba-0000" })] }))).toBe("Close-out: waiting (pr-A claim live)");
  });

  test("a babysitter that released its claim reports its final line", () => {
    setUp("checkout babysit A", "Merged #31 checkout A");
    expect(crewCheck(repo.dir, ["f1a579ba"], deps())).toBe("Close-out: ok · Merged #31 checkout A");
  });

  test("an id the overseer didn't launch is refused", () => {
    setUp("checkout execute 1", CREW);
    expect(crewCheck(repo.dir, ["6c003866"], deps())).toBe("crew check: 6c003866 is not in ## Launched; the overseer closes out only its own sessions");
  });
});
