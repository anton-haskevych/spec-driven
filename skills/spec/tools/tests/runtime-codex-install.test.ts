import { expect, test } from "bun:test";
import evidence from "./fixtures/codex-install/observed.json";
import { unverifiedManagedCapabilities } from "../runtime/capabilities";

test("actual historical package discovery is distinct from materialized candidate state", () => {
  expect(evidence.historicalSource).toBe("22e7ec7b6aae89c4a13c299e1dff024a26a1d1bc");
  expect(Object.keys(evidence.historicalFiles)).toHaveLength(5);
  expect(evidence.historical.localVersion).toBe("2.51.0");
  expect(evidence.historical.skills).toHaveLength(1);
  expect(evidence.historical.skills.every((s) => s.path.includes("/2.51.0/"))).toBe(true);
  expect(evidence.candidate.localVersion).toBe("2.51.0-phase1.1");
  expect(evidence.candidate.skills).toHaveLength(1);
  expect(evidence.candidate.skills.every((s) => s.path.includes("/2.51.0-phase1.1/"))).toBe(true);
});

test("native install observation falsifies automatic immutable-cache retention", () => {
  expect(evidence.retention.historicalCacheExists).toBe(false);
  expect(evidence.retention.candidateCacheExists).toBe(true);
  expect(evidence.retention.oldLoadedHooksBeforeUpgrade).toEqual([]);
  expect(evidence.retention.oldLoadedHooksAfterUpgrade).toEqual([]);
  expect(evidence.retention.oldThreadTurnCount).toBe(0);
  expect(evidence.retention.activeModelReleaseAttestation).toBe("unverified");
});

test("enabled native plugin hook remains untrusted and enables no managed update", () => {
  const hook = evidence.candidate.loadedHooks[0];
  expect(hook).toMatchObject({ enabled: true, isManaged: false, trustStatus: "untrusted", source: "plugin" });
  expect(hook?.sourcePath).toContain("/2.51.0-phase1.1/codex-hooks/hooks.json");
  expect(evidence.safety).toEqual({ liveInstallChanges: false, credentialsCopied: false, trustAccepted: false, hookExecutionProved: false });
  expect(evidence.cliResumeFence).toBe("unverified");
  expect(evidence.desktopResumeFence).toBe("unverified");
  expect(unverifiedManagedCapabilities({ runtime: "codex", key: "fixture" }).every((c) => c.state === "unverified")).toBe(true);
});
