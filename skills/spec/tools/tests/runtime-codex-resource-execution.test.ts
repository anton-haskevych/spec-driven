import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import evidence from "./fixtures/codex-resource-execution/observed.json";
import { unverifiedManagedCapabilities } from "../runtime/capabilities";

test("native thread executes actual historical scripts before selected installation", () => {
  expect(evidence.cliVersion).toBe("0.167.0");
  expect(evidence.historicalSource).toBe("22e7ec7b6aae89c4a13c299e1dff024a26a1d1bc");
  expect(evidence.before.version.exitCode).toBe(0);
  expect(evidence.before.version.output).toContain("All version declarations match: 2.51.0");
  expect(evidence.before.settings.exitCode).toBe(0);
  expect(evidence.before.settings.output).toContain("docs on branch");
  expect(evidence.before.version.threadId).toBe(evidence.oldThread.id);
  expect(evidence.before.settings.threadId).toBe(evidence.oldThread.id);
});

test("post-update old-path execution and fresh candidate execution are separate evidence", () => {
  expect(evidence.after.version.threadId).toBe(evidence.oldThread.id);
  expect(evidence.after.settings.threadId).toBe(evidence.oldThread.id);
  expect(evidence.fresh.version.threadId).toBe(evidence.freshThread.id);
  expect(evidence.freshThread.id).not.toBe(evidence.oldThread.id);
  expect(evidence.fresh.version.exitCode).toBe(0);
  expect(evidence.fresh.version.output).toContain(evidence.candidateVersion);
  expect(evidence.after.version.command).toBe(evidence.before.version.command);
  expect(evidence.after.settings.command).toBe(evidence.before.settings.command);
});

test("the same pinned historical paths fail after native cache eviction", () => {
  expect(evidence.retention).toEqual({ historicalCacheExists: false, candidateCacheExists: true });
  expect(evidence.after.version.exitCode).toBe(2);
  expect(evidence.after.version.output).toContain("No such file or directory");
  expect(evidence.after.settings.exitCode).toBe(1);
  expect(evidence.after.settings.output).toContain("Module not found");
  expect(evidence.after.settings.output).toContain("/2.51.0/skills/spec/tools/spec.ts");
  expect(evidence.after.version.turnStatus).toBe("completed");
  expect(evidence.after.settings.turnStatus).toBe("completed");
  expect(evidence.fresh.settings.exitCode).toBe(0);
  const historicalScript = readFileSync(new URL("./fixtures/codex-resource-execution/historical-version.py.txt", import.meta.url));
  expect(createHash("sha256").update(historicalScript).digest("hex")).toBe(evidence.historicalFiles["scripts/version.py"]);
});

test("direct thread shell observations cannot enable managed runtime capabilities", () => {
  expect(evidence.executionRoute).toBe("thread/shellCommand");
  expect(evidence.account).toMatchObject({ accountPresent: false, requiresOpenaiAuth: true });
  expect(evidence.activeModelReleaseAttestation).toBe("unverified");
  expect(evidence.limits.modelTurnsStarted).toBe(0);
  expect(evidence.limits.oldLoadedSkillAttestation).toBe("unverified");
  for (const phase of [evidence.before, evidence.after, evidence.fresh]) {
    for (const execution of Object.values(phase)) {
      expect(execution.source).toBe("userShell");
      expect(execution.pluginId).toBeNull();
      expect(execution.scriptPath).toBeNull();
    }
  }
  expect(evidence.safety).toEqual({ liveInstallChanges: false, credentialsCopied: false, trustBypassed: false, modelOrPermissionOverrides: false });
  expect(evidence.cleanup.archivedThreadIds.sort()).toEqual([evidence.oldThread.id, evidence.freshThread.id].sort());
  expect(evidence.cleanup.remainingTerminals).toBe(0);
  expect(evidence.cleanup.processes.every((process) => process.absent)).toBe(true);
  expect(unverifiedManagedCapabilities({ runtime: "codex", key: "fixture" }).every((c) => c.state === "unverified")).toBe(true);
});
