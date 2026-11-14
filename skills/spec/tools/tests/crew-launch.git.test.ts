import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { crewLaunch } from "../commands/crew/launch";
import { SETTINGS_FILE } from "../playbook/settings";
import { newRunFile, parseRunFile } from "../crew/run-state";
import type { Placement } from "../trees/place";
import { claudeAnd, crewDeps } from "./crew-deps";
import { repoWithOrigin, type TestRepo } from "./git-repo";

const BACKGROUNDED = readFileSync(join(import.meta.dir, "fixtures", "claude-bg-stdout.txt"), "utf8");

describe("crew launch", () => {
  let repo: TestRepo;
  afterEach(() => repo?.cleanup());
  const crew = () => join(repo.dir, ".git", "spec-board", "crew");

  function setUp(withRun = true) {
    repo = repoWithOrigin("crew-launch-");
    mkdirSync(crew(), { recursive: true });
    if (withRun) writeFileSync(join(crew(), "run.md"), newRunFile({ overseer: "48777164-0d07", runner: "anton-haskevych", started: "2026-10-12T20:00:00-07:00", caps: { workers: 2, babysitters: 1 } }));
  }

  const fresh = (path: string): Placement => ({ kind: "added", path, branch: "feat/checkout-pr-a", how: "created", setup: { copied: [] }, bootstrap: "fresh-tree" });
  const placeAt = (placement: Placement) => async () => ({ ok: true as const, value: placement });

  test("writes the brief, starts claude --bg in the placed tree and records the id", async () => {
    setUp();
    const calls: string[][] = [];
    const deps = crewDeps({ runner: claudeAnd([[["claude", "--bg"], { stdout: BACKGROUNDED }]], calls) });
    const result = await crewLaunch(repo.dir, ["execute", "checkout", "phase-3", "--note", "Merge main first"], deps, placeAt(fresh("/trees/checkout-pr-a")));

    expect(result.split("\n").at(-1)).toBe("Launched: background 8b25966f · checkout execute 3");
    const brief = join(realpathSync(crew()), "briefs", "checkout#3.md");
    expect(calls[0]).toEqual(["claude", "--bg", "-n", "checkout execute 3", "--permission-mode", "bypassPermissions", "--append-system-prompt-file", brief, "/spec-driven:spec execute checkout 3"]);
    const text = readFileSync(brief, "utf8");
    expect(text).toContain("You are a crew worker started by the overseer session 48777164-0d07.");
    expect(text).toContain("Spec checkout · phase 3 · tree /trees/checkout-pr-a");
    expect(text).toContain("- Merge main first\n- Fresh tree: work through gate fresh-tree");
    const run = readFileSync(join(crew(), "run.md"), "utf8");
    expect(parseRunFile(run).launched).toMatchObject([{ id: "8b25966f", title: "checkout execute 3" }]);
    expect(parseRunFile(run).launched[0]?.at).toMatch(/^2026-10-1\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
    expect(run).toContain("launched 8b25966f · checkout execute 3");
  });

  test("a babysitter with hold: hold-for-review brief, hold in the prompt, brief named for the PR group", async () => {
    setUp();
    const calls: string[][] = [];
    const deps = crewDeps({ runner: claudeAnd([[["claude", "--bg"], { stdout: BACKGROUNDED }]], calls) });
    const found: Placement = { kind: "found", path: "/trees/checkout-pr-b", branch: "feat/checkout-pr-b" };
    await crewLaunch(repo.dir, ["babysit", "checkout", "B", "hold"], deps, placeAt(found));
    expect(calls[0]?.at(-1)).toBe("/spec-driven:spec babysit checkout B hold");
    const text = readFileSync(join(crew(), "briefs", "checkout#pr-B.md"), "utf8");
    expect(text).toContain("Spec checkout · PR group B · tree /trees/checkout-pr-b");
    expect(text).toContain("Ship mode for this spec: hold-for-review.");
  });

  test("a worker's ship mode comes from the spec in its tree", async () => {
    setUp();
    const tree = join(repo.root, "tree-a");
    mkdirSync(join(tree, "docs", "specs", "checkout"), { recursive: true });
    writeFileSync(join(tree, "docs", "specs", "checkout", "CLAUDE.md"), "---\nstatus: active\nship: auto\n---\n# Checkout\n");
    const deps = crewDeps({ runner: claudeAnd([[["claude", "--bg"], { stdout: BACKGROUNDED }]]) });
    await crewLaunch(repo.dir, ["execute", "checkout", "3"], deps, placeAt({ kind: "found", path: tree, branch: "feat/checkout-pr-a" }));
    expect(readFileSync(join(crew(), "briefs", "checkout#3.md"), "utf8")).toContain("Ship mode for this spec: auto.");
  });

  test("a spec without ship: takes settings pr.ship from its tree", async () => {
    setUp();
    const tree = join(repo.root, "tree-b");
    mkdirSync(join(tree, "docs", "specs", "checkout"), { recursive: true });
    mkdirSync(join(tree, "docs", "specs", "_playbook"), { recursive: true });
    writeFileSync(join(tree, "docs", "specs", "checkout", "CLAUDE.md"), "---\nstatus: active\n---\n# Checkout\n");
    writeFileSync(join(tree, SETTINGS_FILE), "---\npr:\n  ship: hold-for-review\n---\n");
    const deps = crewDeps({ runner: claudeAnd([[["claude", "--bg"], { stdout: BACKGROUNDED }]]) });
    await crewLaunch(repo.dir, ["execute", "checkout", "3"], deps, placeAt({ kind: "found", path: tree, branch: "feat/checkout-pr-a" }));
    expect(readFileSync(join(crew(), "briefs", "checkout#3.md"), "utf8")).toContain("Ship mode for this spec: hold-for-review (settings pr.ship).");
  });

  test("a busy tree or a failed claude --bg records nothing", async () => {
    setUp();
    const before = readFileSync(join(crew(), "run.md"), "utf8");
    const busy: Placement = { kind: "busy", path: "/trees/x", branch: "b", holder: "after checkout 2 (s1)" };
    expect(await crewLaunch(repo.dir, ["execute", "checkout", "3"], crewDeps(), placeAt(busy))).toBe("launch: /trees/x is busy, after checkout 2 (s1); not launched");
    const failing = crewDeps({ runner: claudeAnd([[["claude", "--bg"], { code: 1, stderr: "Workspace not trusted" }]]) });
    const result = await crewLaunch(repo.dir, ["execute", "checkout", "3"], failing, placeAt(fresh("/trees/y")));
    expect(result.split("\n").at(-1)).toBe("launch: claude --bg failed: Workspace not trusted");
    expect(readFileSync(join(crew(), "run.md"), "utf8")).toBe(before);
  });

  test("no run.md: crew start comes first; bad arguments are a usage line", async () => {
    setUp(false);
    expect(await crewLaunch(repo.dir, ["execute", "checkout", "3"], crewDeps(), placeAt(fresh("/t")))).toBe("crew launch: no run.md yet; run crew start first");
    expect(existsSync(join(crew(), "briefs"))).toBe(false);
    expect(await crewLaunch(repo.dir, ["prep", "checkout"], crewDeps())).toStartWith("usage: crew launch");
    expect(await crewLaunch(repo.dir, ["execute", "checkout", "3", "hold"], crewDeps())).toStartWith("usage: crew launch");
  });

  test("a worker's placement is gated to the crew's runner; a babysitter's is not", async () => {
    setUp();
    const places: unknown[] = [];
    const recording = async (spec: string, phase: string, options: object) => {
      places.push([spec, phase, options]);
      return { ok: true as const, value: fresh("/trees/checkout-pr-a") };
    };
    const deps = crewDeps({ runner: claudeAnd([[["claude", "--bg"], { stdout: BACKGROUNDED }]]) });
    await crewLaunch(repo.dir, ["execute", "checkout", "3"], deps, recording);
    await crewLaunch(repo.dir, ["babysit", "checkout", "B"], deps, recording);
    expect(places).toEqual([
      ["checkout", "3", { onlyFor: "anton-haskevych" }],
      ["checkout", "pr-B", { existingOnly: true }],
    ]);
  });

  test("a run with no runner launches nothing", async () => {
    setUp();
    const run = join(crew(), "run.md");
    writeFileSync(run, readFileSync(run, "utf8").replace("runner: anton-haskevych\n", ""));
    expect(await crewLaunch(repo.dir, ["execute", "checkout", "3"], crewDeps(), placeAt(fresh("/t")))).toBe("crew launch: can't tell who runs this crew; run crew start again");
    expect(existsSync(join(crew(), "briefs"))).toBe(false);
  });
});
