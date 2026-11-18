import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { crewCheck } from "../commands/crew/check";
import { crewLaunch } from "../commands/crew/launch";
import { crewOverseer, crewStart } from "../commands/crew/overseer";
import type { SpecBranchStarter } from "../commands/crew/spec-branch";
import { parseRunFile } from "../crew/run-state";
import type { Placement } from "../trees/place";
import { fastCrewDeps } from "./crew-fake-deps";
import { crewTree, env, OWN } from "./crew-tick-fast";
import { liveSession } from "./factories";

const BACKGROUNDED = readFileSync(join(import.meta.dir, "fixtures", "claude-bg-stdout.txt"), "utf8");
const OTHER = "9a8b7c6d-0000-4000-8000-000000000000";
const found: Placement = { kind: "found", path: "/trees/alpha-pr-a", branch: "feat/alpha-pr-a" };
const placeFound = async () => ({ ok: true as const, value: found });
const claude = [[["claude", "--version"], { stdout: "2.1.300 (Claude Code)\n" }], [["claude", "--bg"], { stdout: BACKGROUNDED }]] as const;

function starter(result: { ok: boolean; lines: string[] } = { ok: true, lines: ["Spec branch: feat/alpha cut from main c0ffee1"] }) {
  const calls: Array<{ spec: string; shipAlone: string[] }> = [];
  const start: SpecBranchStarter = async (_dir, spec, shipAlone) => {
    calls.push({ spec, shipAlone });
    return result;
  };
  return { start, calls };
}

describe("a crew on one spec", () => {
  let tree: ReturnType<typeof crewTree>;
  afterEach(() => tree?.cleanup());
  const crewFile = (name: string) => join(tree.root, ".git", "spec-board", "crew", name);

  test("crew start --spec turns spec-branch mode on, writes run-<spec>.md with the spec, and crew overseer --spec reads it", async () => {
    tree = crewTree();
    const deps = fastCrewDeps(tree.root, { env, claude });
    const { start, calls } = starter();
    expect(await crewStart(tree.root, ["--spec", "alpha", "--workers", "2", "--ship-alone", "D,E"], deps, start)).toBe(
      `Spec branch: feat/alpha cut from main c0ffee1\nCrew: started for spec-tests · overseer ${OWN} · 2 workers, 2 babysitters`,
    );
    expect(calls).toEqual([{ spec: "alpha", shipAlone: ["D", "E"] }]);
    expect(parseRunFile(readFileSync(crewFile("run-alpha.md"), "utf8"))).toMatchObject({ spec: "alpha", overseer: OWN, state: "running" });
    expect(existsSync(crewFile("run.md"))).toBe(false);
    const other = fastCrewDeps(tree.root, { env: { CLAUDE_CODE_SESSION_ID: OTHER }, sessions: [liveSession({ sessionId: OWN, name: "alpha oversee-crew" })] });
    expect(crewOverseer(tree.root, ["--spec", "alpha"], other)).toBe(`Overseer: another live overseer ${OWN} · alpha oversee-crew`);
    expect(crewOverseer(tree.root, [], other)).toBe("Overseer: this session");
  });

  test("crew start --spec writes no run file when spec-branch mode refuses to start", async () => {
    tree = crewTree();
    const deps = fastCrewDeps(tree.root, { env, claude });
    const refusal = "crew start: alpha is not on the board; spec-branch mode needs the record (spec.ts join alpha)";
    expect(await crewStart(tree.root, ["--spec", "alpha"], deps, starter({ ok: false, lines: [refusal] }).start)).toBe(refusal);
    expect(existsSync(crewFile("run-alpha.md"))).toBe(false);
  });

  test("ship-alone groups belong to a spec crew only", async () => {
    tree = crewTree();
    const { start, calls } = starter();
    expect(await crewStart(tree.root, ["--ship-alone", "D"], fastCrewDeps(tree.root, { env, claude }), start)).toStartWith("usage: crew start");
    expect(calls).toEqual([]);
  });

  test("crew start --spec refuses while the board crew has any session on that spec, live or not", async () => {
    tree = crewTree();
    tree.run({ launched: [{ id: "a1", title: "alpha execute 3", at: "t0" }, { id: "b1", title: "beta execute 1", at: "t0" }] });
    const deps = fastCrewDeps(tree.root, { env, claude });
    const { start, calls } = starter();
    expect(await crewStart(tree.root, ["--spec", "alpha"], deps, start)).toBe("crew start: the board crew has alpha execute 3 · a1 on alpha; pause it first");
    expect(existsSync(crewFile("run-alpha.md"))).toBe(false);
    expect(calls).toEqual([]);
    expect(await crewStart(tree.root, ["--spec", "gamma"], deps, start)).toContain("Crew: started");
  });

  test("crew launch files a worker under its spec's open run, and under run.md otherwise", async () => {
    tree = crewTree();
    tree.run();
    tree.run({ spec: "alpha", workers: 2 });
    const deps = fastCrewDeps(tree.root, { env, claude });
    await crewLaunch(tree.root, ["execute", "alpha", "3"], deps, placeFound);
    await crewLaunch(tree.root, ["execute", "beta", "1"], deps, placeFound);
    expect(parseRunFile(readFileSync(crewFile("run-alpha.md"), "utf8")).launched.map((entry) => entry.title)).toEqual(["alpha execute 3"]);
    expect(parseRunFile(readFileSync(crewFile("run.md"), "utf8")).launched.map((entry) => entry.title)).toEqual(["beta execute 1"]);
  });

  test("crew check finds a session in whichever run launched it", () => {
    tree = crewTree();
    tree.run();
    tree.run({ spec: "alpha", launched: [{ id: "a1", title: "alpha execute 3", at: "t0" }] });
    const deps = fastCrewDeps(tree.root, { env, claude: [[["claude", "agents"], { code: 1, stderr: "roster down" }]] });
    expect(crewCheck(tree.root, ["zz"], deps)).toBe("crew check: zz is not in any run's ## Launched; the overseer closes out only its own sessions");
    expect(crewCheck(tree.root, ["a1"], deps)).toBe("crew check: claude agents failed: roster down");
  });
});
