import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SETTINGS_FILE } from "../playbook/settings";
import { crewOverseer, crewStart } from "../commands/crew/overseer";
import { parseRunFile, withRunner } from "../crew/run-state";
import { liveSession } from "./factories";
import { crewDeps } from "./crew-deps";
import { anonymousRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { stubRunner } from "./stub-runner";

const OWN = "48777164-0d07-4950-a27e-f5187ba29739";
const TAB = "4efef1e3-0f75-4623-beeb-95b1e6509824";
const env = { CLAUDE_CODE_SESSION_ID: OWN };

describe("crew overseer / crew start", () => {
  let repo: TestRepo;
  afterEach(() => repo?.cleanup());
  const runPath = () => join(repo.dir, ".git", "spec-board", "crew", "run.md");

  test("with no run yet it is this session's; start writes the run with this id and the caps", () => {
    repo = repoWithOrigin("crew-start-");
    expect(crewOverseer(repo.dir, [], crewDeps({ env }))).toBe("Overseer: this session");
    expect(crewStart(repo.dir, ["--workers", "2", "--babysitters", "1"], crewDeps({ env }))).toBe("Crew: started for spec-tests · overseer " + OWN + " · 2 workers, 1 babysitters");
    expect(parseRunFile(readFileSync(runPath(), "utf8"))).toMatchObject({ overseer: OWN, runner: "spec-tests", state: "running", caps: { workers: 2, babysitters: 1 } });
  });

  test("a new run takes its caps from settings crew:, and a flag beats the setting", () => {
    repo = repoWithOrigin("crew-start-");
    const settings = join(repo.dir, SETTINGS_FILE);
    mkdirSync(dirname(settings), { recursive: true });
    writeFileSync(settings, "---\ncrew:\n  workers: 5\n  babysitters: 1\n---\n");
    expect(crewStart(repo.dir, ["--babysitters", "0"], crewDeps({ env }))).toBe(`Crew: started for spec-tests · overseer ${OWN} · 5 workers, 0 babysitters`);
  });

  test("a resumed overseer whose old tab parked into it takes its own run over", () => {
    repo = repoWithOrigin("crew-start-");
    crewStart(repo.dir, [], crewDeps({ env: { CLAUDE_CODE_SESSION_ID: TAB } }));
    const sessions = [liveSession({ sessionId: TAB, parkedJobId: "48777164" }), liveSession({ sessionId: OWN })];
    expect(crewOverseer(repo.dir, [], crewDeps({ env, sessions }))).toBe(`Overseer: taking over from ${TAB} (parked into this session)`);
    expect(crewStart(repo.dir, [], crewDeps({ env, sessions }))).toBe(`Crew: taken over from ${TAB} for spec-tests · overseer ${OWN} · 3 workers, 2 babysitters`);
    expect(parseRunFile(readFileSync(runPath(), "utf8")).overseer).toBe(OWN);
  });

  test("no git user.name: start refuses and writes no run", () => {
    repo = repoWithOrigin("crew-start-");
    expect(crewStart(repo.dir, [], crewDeps({ env, runner: anonymousRunner }))).toBe("crew start: can't tell who you are; set git user.name, then start again");
    expect(existsSync(runPath())).toBe(false);
  });

  test("a takeover rewrites the runner from the new session's git name and says when it changed", () => {
    repo = repoWithOrigin("crew-start-");
    crewStart(repo.dir, [], crewDeps({ env: { CLAUDE_CODE_SESSION_ID: TAB } }));
    writeFileSync(runPath(), withRunner(readFileSync(runPath(), "utf8"), "taras-korpach"));
    const sessions = [liveSession({ sessionId: TAB, parkedJobId: "48777164" }), liveSession({ sessionId: OWN })];
    expect(crewStart(repo.dir, [], crewDeps({ env, sessions }))).toBe(`Crew: taken over from ${TAB} for spec-tests (was taras-korpach) · overseer ${OWN} · 3 workers, 2 babysitters`);
    expect(parseRunFile(readFileSync(runPath(), "utf8")).runner).toBe("spec-tests");
  });

  test("another live overseer: start refuses and writes nothing", () => {
    repo = repoWithOrigin("crew-start-");
    crewStart(repo.dir, [], crewDeps({ env: { CLAUDE_CODE_SESSION_ID: TAB } }));
    const before = readFileSync(runPath(), "utf8");
    const sessions = [liveSession({ sessionId: TAB, name: "repo oversee-crew" })];
    expect(crewStart(repo.dir, [], crewDeps({ env, sessions }))).toBe(`crew start: another live overseer ${TAB} · repo oversee-crew`);
    expect(readFileSync(runPath(), "utf8")).toBe(before);
  });

  test("unreadable sessions: no take-over", () => {
    repo = repoWithOrigin("crew-start-");
    crewStart(repo.dir, [], crewDeps({ env: { CLAUDE_CODE_SESSION_ID: TAB } }));
    const blind = crewDeps({ env, liveSessions: () => ({ ok: false, reason: "no sessions" }) });
    expect(crewOverseer(repo.dir, [], blind)).toBe("crew overseer: can't read sessions (no sessions); not taking over");
  });

  test("start records the claude version when it answers", () => {
    repo = repoWithOrigin("crew-start-");
    const runner = stubRunner([[["claude", "--version"], { stdout: "2.1.296 (Claude Code)\n" }]]);
    const git = { run: (argv: readonly string[], options?: object) => (argv[0] === "claude" ? runner.run(argv) : crewDeps().runner.run(argv, options)) };
    crewStart(repo.dir, [], crewDeps({ env, runner: git }));
    expect(readFileSync(runPath(), "utf8")).toContain("cli: 2.1.296");
  });

  test("bad caps are a usage line", () => {
    repo = repoWithOrigin("crew-start-");
    expect(crewStart(repo.dir, ["--workers", "zero"], crewDeps({ env }))).toStartWith("usage: crew start");
  });
});
