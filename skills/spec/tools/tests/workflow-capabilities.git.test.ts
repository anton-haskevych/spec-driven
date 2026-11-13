import { expect, test } from "bun:test";
import { pilotCommandRefusal, pilotModeRefusal, type LocalPilot } from "../runtime/workflow-capabilities";
import { run } from "../spec";
import { createContextFixture } from "./context-fixture";
import { phaseCommand } from "../commands/phase";
import { isolatedRunner } from "./git-repo";
import { joinedRepo } from "./joined-repo";

const pilot: LocalPilot = { kind: "local-pilot", spec: "checkout", phase: "2" };

test("pilot refuses unready command families and unknown commands before dispatch", async () => {
  for (const name of ["claim", "trees", "board", "list", "launch", "crew", "push", "publish-docs", "pr", "owner", "focus", "ship", "page", "__proto__", "new-command"]) {
    expect(pilotCommandRefusal([name, "take", "checkout", "2"], pilot)).toContain("unavailable in local-pilot");
    expect(await run([name], "/missing", { workflow: pilot })).toContain("unavailable in local-pilot");
  }
});

test("pilot refuses context inference, unsupported modes and another target before its override", async () => {
  const context = { run() { throw new Error("must not dispatch"); } };
  for (const args of [[], ["execute"], ["execute", "checkout"], ["execute", "checkout", "3"], ["review", "checkout", "2"], ["execute", "other", "2"]]) {
    expect(await run(["context", ...args], "/missing", { workflow: pilot, context })).toContain("local-pilot");
  }
  expect(await run(["context", "execute", "checkout", "phase", "2"], "/missing", {
    workflow: pilot, context: { run: () => "configured native context" },
  })).toBe("configured native context");
});

test("pilot enables local validation and exact progress actions without outward sub-actions", () => {
  for (const argv of [
    ["doctor", "checkout"], ["graph", "checkout"], ["ready", "checkout"], ["playbooks", "checkout"],
    ["gates", "--name", "local"], ["settings"], ["lessons", "recall", "src/file.ts"],
    ["lessons", "add", "gotcha.md", "checkout"], ["phase", "tick", "checkout", "2", "#1"],
    ["phase", "park", "checkout", "2", "question"], ["phase", "unpark", "checkout", "2", "answer"],
  ]) expect(pilotCommandRefusal(argv, pilot)).toBeUndefined();
  for (const argv of [["phase", "deployed", "checkout", "2", "--land"], ["phase", "add", "checkout"], ["phase", "tick", "checkout", "3", "#1"], ["lessons", "new-action"]]) {
    expect(pilotCommandRefusal(argv, pilot)).toContain("local-pilot");
  }
});

test("pilot mode contract is explicit and Claude dispatch keeps its default behavior", async () => {
  for (const mode of ["execute", "resume", "handoff", "update", "status"]) expect(pilotModeRefusal(mode)).toBeUndefined();
  for (const mode of ["review", "prep", "create", "idea", "babysit", "oversee-crew"]) expect(pilotModeRefusal(mode)).toContain("local-pilot");
  expect(await run(["context", "anything"], "/missing", { context: { run: () => "legacy override" } })).toBe("legacy override");
  expect(await run(["settings"], "/missing")).toContain("plugin defaults");
  expect(await run(["unknown"], "/missing")).toStartWith("usage:");
  expect(await run(["context", "execute", "checkout", "2"], "/missing", { workflow: pilot }))
    .toContain("context binding unavailable in local-pilot");
});

test("raw spec executable refuses Codex before invoking legacy commands", () => {
  const child = Bun.spawnSync([process.execPath, `${import.meta.dir}/../spec.ts`, "claim", "take", "checkout", "2"], {
    cwd: import.meta.dir, env: { ...process.env, CODEX_THREAD_ID: "fixture-thread", CLAUDE_CODE_SESSION_ID: "" },
  });
  expect(child.exitCode).toBe(1);
  expect(child.stdout.toString()).toContain("Codex requires the packaged native entry");
  expect(child.stdout.toString()).not.toContain("claim:");
});

test("park advice follows declared workflow while Claude keeps its push instruction", async () => {
  const fixture = createContextFixture();
  try {
    const args = ["phase", "park", "checkout", "2", "Which option?"];
    expect(await run(args, fixture.project)).toContain("Commit and push the note, then hand off.");
    await run(["phase", "unpark", "checkout", "2", "Local"], fixture.project);
    const result = await run(args, fixture.project, { workflow: pilot });
    expect(result).toContain("Commit the note locally, then hand off.");
    expect(result).not.toContain("push the note");
  } finally { fixture.cleanup(); }
});

test("pilot: tick, park and unpark refuse on a joined spec and write nothing", async () => {
  const repo = joinedRepo("spec-pilot-joined-");
  try {
    const alpha: LocalPilot = { kind: "local-pilot", spec: "alpha", phase: "2" };
    const deps = { runner: isolatedRunner, env: {}, now: () => new Date("2026-11-12T10:00:00Z") };
    for (const argv of [["tick", "alpha", "2", "2.3"], ["park", "alpha", "2", "question"], ["unpark", "alpha", "2", "answer"]]) {
      expect(pilotCommandRefusal(["phase", ...argv], alpha)).toBeUndefined();
      expect(await phaseCommand(repo.dir, argv, alpha, deps)).toBe(`phase ${argv[0]}: alpha is on the board; a Codex pilot can't write it yet`);
    }
    expect(repo.git("status", "--porcelain")).toBe("");
  } finally {
    repo.cleanup();
  }
});
