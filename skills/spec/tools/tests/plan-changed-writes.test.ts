import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contextPack } from "../commands/context";
import { phaseCommand } from "../commands/phase";
import { sessionPlanMemory } from "../plan/plan-version";
import { isolatedRunner, type TestRepo, type WorkingCopy } from "./git-repo";
import { contextDeps } from "./context-fixture";
import { joinedRepo } from "./joined-repo";

const NOW = new Date("2026-11-12T10:00:00Z");
const REAL_GIT_MS = 30_000;

describe("a write tells the session the plan changed since it last saw it (real git)", () => {
  let repo: TestRepo;
  let memoryDir: string;

  function session(copy: WorkingCopy, id: string) {
    const deps = { runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: id }, now: () => NOW, memory: sessionPlanMemory(id, memoryDir) };
    return (...args: string[]) => Promise.resolve(phaseCommand(copy.dir, args, undefined, deps));
  }

  beforeAll(() => {
    repo = joinedRepo("spec-plan-changed-");
    memoryDir = mkdtempSync(join(tmpdir(), "spec-plan-changed-memory-"));
  });
  afterAll(() => {
    repo.cleanup();
    rmSync(memoryDir, { recursive: true, force: true });
  });

  test("its own change is never news; another session's is named once, before the result line, even on a refusal", async () => {
    const a = session(repo.clone("pr-a"), "sa");
    const b = session(repo.clone("pr-b"), "sb");

    expect(await a("set", "alpha", "3", "--title", "Renamed")).toStartWith("set: phase 3");
    expect(await b("add", "alpha", "Polish", "--needs", "3")).toStartWith("add: phase 4 — Polish");

    const heard = await a("deployed", "alpha", "2", "--date", "2026-11-12");
    expect(heard.split("\n")[0]).toBe("Plan changed since this session loaded it (v2 → v3): phase 4 added");
    expect(heard.split("\n").at(-1)).toBe("phase deployed: Phase 2 is not ticked; only a finished phase can be deployed");

    expect(await a("park", "alpha", "3", "Ship today?")).toStartWith("question: q1 open on phase 3");
    expect(await b("park", "alpha", "4", "Copy ok?")).toStartWith("question: q2 open on phase 4");
  }, REAL_GIT_MS);
});

describe("a pack tells the session the plan changed since its last pack (real git)", () => {
  let repo: TestRepo;
  let memoryDir: string;

  beforeAll(() => {
    repo = joinedRepo("spec-plan-changed-pack-");
    memoryDir = mkdtempSync(join(tmpdir(), "spec-plan-changed-pack-memory-"));
  });
  afterAll(() => {
    repo.cleanup();
    rmSync(memoryDir, { recursive: true, force: true });
  });

  test("under the Board line, once per version; the first pack only remembers", async () => {
    const deps = contextDeps({ runner: isolatedRunner, now: () => NOW, memory: sessionPlanMemory("sp", memoryDir) });
    const pack = () => contextPack(repo.dir, { mode: "resume", name: "alpha" }, deps).then((text) => text.split("\n").filter((line) => !line.startsWith("Card ")).slice(1, 3));
    expect(await pack()).toEqual(["Board: live · plan v1", ""]);

    const other = repo.clone("pr-b");
    const add = { runner: isolatedRunner, env: {}, now: () => NOW };
    expect(await phaseCommand(other.dir, ["add", "alpha", "Polish", "--needs", "3"], undefined, add)).toStartWith("add: phase 4 — Polish");

    expect(await pack()).toEqual(["Board: live · plan v2", "Plan changed since this session loaded it (v1 → v2): phase 4 added"]);
    expect(await pack()).toEqual(["Board: live · plan v2", ""]);
  }, REAL_GIT_MS);
});
