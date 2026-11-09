import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runCodexEntry, type CodexEntryDeps, type CodexEntryRequest } from "../runtime/codex/entry";
import { inspectCandidate } from "../runtime/codex/candidate";
import { probeCodex } from "../runtime/codex/probe";
import type { ReadOnlyRpc } from "../runtime/codex/transport";
import { createContextFixture } from "./context-fixture";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { asyncStubRunner } from "./stub-runner";

const root = realpathSync(join(import.meta.dir, "../../../.."));
let legacy: TestRepo;
let pilot: TestRepo;
let request: CodexEntryRequest;
let deps: CodexEntryDeps;
let calls: string[];

beforeEach(() => {
  legacy = repoWithOrigin("codex-entry-legacy-");
  pilot = repoWithOrigin("codex-entry-pilot-");
  const fixture = createContextFixture();
  cpSync(join(fixture.project, "docs"), join(pilot.dir, "docs"), { recursive: true });
  fixture.cleanup();
  const assets = inspectCandidate(root);
  if (!assets.ok) throw new Error(assets.reason);
  request = { cwd: realpathSync(pilot.dir), legacyProjectDir: legacy.dir, revision: assets.value.revision,
    request: { mode: "execute", name: "checkout", hint: "2" } };
  calls = [];
  deps = { assets: assets.value, env: { CODEX_THREAD_ID: "native-own" }, runner: isolatedRunner, now: () => "2026-11-09T12:00:00Z",
    observe: async (input) => {
      const rpc: ReadOnlyRpc = { close() { calls.push("close"); }, async request(method) {
        calls.push(method);
        return { ok: true, value: method === "thread/loaded/list" ? { data: ["native-own"], nextCursor: null }
          : { thread: { id: "native-own", cwd: request.cwd, updatedAt: 1794225600, status: { type: "idle" } } } };
      } };
      return probeCodex(input, { observedAt: "now", connect: async () => ({ ok: true, value: rpc }),
        runner: asyncStubRunner([[ ["codex", "app-server", "daemon", "version"], { stdout: JSON.stringify({
          status: "running", socketPath: "/fixture/daemon.sock", cliVersion: "0.167.0", appServerVersion: "0.167.0",
        }) } ]]),
      });
    },
  };
});
afterEach(() => { legacy?.cleanup(); pilot?.cleanup(); });

function output(result: Awaited<ReturnType<typeof runCodexEntry>>): string {
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

test("native entry binds candidate bytes, actual ID/cwd and one scan to stored context", async () => {
  const text = output(await runCodexEntry(request, deps));
  expect(text).toContain("Workflow: local-pilot");
  expect(text).toContain(`Candidate: ${root}`);
  expect(text).toContain(request.revision);
  expect(text).toContain("native-own");
  expect(text).toContain(request.cwd);
  expect(text).toContain("Picked: Phase 2");
  expect(text).toContain("Taxonomy");
  expect(text).toContain("Ownership: not acquired");
  expect(calls).toEqual(["thread/loaded/list", "thread/read", "close"]);
  expect(pilot.git("status", "--porcelain")).toContain("docs/");
});

test("missing/conflicting identity and wrong candidate revision refuse before Git/native work", async () => {
  const noGit = { run() { throw new Error("must not read Git"); } };
  for (const env of [{}, { CODEX_THREAD_ID: "native-own", CLAUDE_CODE_SESSION_ID: "native-own" }, { CLAUDE_CODE_SESSION_ID: "claude" }]) {
    expect((await runCodexEntry(request, { ...deps, env, runner: noGit })).ok).toBe(false);
  }
  const result = await runCodexEntry({ ...request, revision: "sha256:wrong" }, { ...deps, runner: noGit });
  expect(result).toMatchObject({ ok: false, reason: expect.stringContaining("candidate revision") });
  expect(calls).toEqual([]);
});

test("unsupported modes/actions and inference refuse before any native reads or legacy dispatch", async () => {
  const noGit = { run() { throw new Error("must not read Git"); } };
  for (const command of [["claim", "take", "checkout", "2"], ["trees", "prune", "--apply"], ["push"], ["phase", "deployed", "checkout", "2", "--land"]]) {
    expect(await runCodexEntry({ ...request, command }, { ...deps, runner: noGit })).toMatchObject({ ok: false, reason: expect.stringContaining("local-pilot") });
  }
  expect((await runCodexEntry({ ...request, request: { mode: "review", name: "checkout", hint: "2" } }, deps)).ok).toBe(false);
  expect((await runCodexEntry({ ...request, request: { mode: "execute" } }, deps)).ok).toBe(false);
  expect(calls).toEqual([]);
});

test("same-common-directory and linked pilot checkouts refuse before native access", async () => {
  expect(await runCodexEntry({ ...request, legacyProjectDir: request.cwd }, deps)).toMatchObject({ ok: false, reason: expect.stringContaining("common directory") });
  const tree = pilot.addWorktree("sibling", "feat/sibling");
  expect((await runCodexEntry({ ...request, cwd: realpathSync(tree.dir) }, deps)).ok).toBe(false);
  expect((await runCodexEntry(request, deps)).ok).toBe(false);
  expect(calls).toEqual([]);
});

test("unknown phase/prep layouts refuse rather than falling back to a free phase or empty pack", async () => {
  expect((await runCodexEntry({ ...request, request: { mode: "execute", name: "checkout", hint: "99" } }, deps)).ok).toBe(false);
  writeFileSync(join(pilot.dir, "docs/specs/checkout/progress.md"), "");
  expect((await runCodexEntry(request, deps)).ok).toBe(false);
  expect(calls).toEqual([]);
});

test("native mismatch/unavailable coverage refuses and alternate-home is not enabled", async () => {
  const observe = deps.observe;
  deps.observe = async (input) => {
    const report = await observe(input);
    return { ...report, discovery: { ...report.discovery, state: "unverified", reason: "current native thread ID/cwd not correlated" } };
  };
  expect((await runCodexEntry(request, deps)).ok).toBe(false);
  calls = [];
  expect((await runCodexEntry(request, { ...deps, env: { CODEX_THREAD_ID: "native-own", CODEX_HOME: "/alternate" } })).ok).toBe(false);
  expect(calls).toEqual([]);
});

test("an observed discovery label cannot replace own cwd, complete coverage or exclusive use", async () => {
  const observe = deps.observe;
  for (const kind of ["cwd", "coverage", "occupied"] as const) {
    deps.observe = async (input) => {
      const report = await observe(input);
      const own = report.snapshot.sessions[0]!;
      return { ...report, snapshot: {
        sessions: kind === "occupied" ? [own, { ...own, ref: { ...own.ref, id: "other" } }] : [{ ...own, cwd: kind === "cwd" ? "/wrong" : own.cwd }],
        coverage: kind === "coverage" ? [{ source: input.source, state: "unavailable", reason: "fixture incomplete" }] : report.snapshot.coverage,
      } };
    };
    expect((await runCodexEntry(request, deps)).ok).toBe(false);
  }
});

test("handoff retains the actual mode while loading shared resume context and local validation", async () => {
  request.request.mode = "handoff";
  const text = output(await runCodexEntry(request, deps));
  expect(text).toContain("Request: handoff checkout 2");
  expect(text).toContain('mode="resume"');
  expect(text).not.toContain("Handoff complete");
  expect(output(await runCodexEntry({ ...request, command: ["settings"] }, deps))).toContain("plugin defaults");
});

test("stored claims cannot bypass ownership refusal through explicit phase hints or local mutations", async () => {
  const dir = join(pilot.dir, ".git/spec-board/claims");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "checkout#2.json"), JSON.stringify({ schemaVersion: 1, spec: "checkout", phase: "2", workspace: request.cwd,
    claimedAt: "now", ref: { source: { runtime: "codex", key: "unknown-source" }, id: "other" } }));
  const phase = await Bun.file(join(pilot.dir, "docs/specs/checkout/phases/phase-2.md")).text();
  for (const command of [undefined, ["phase", "tick", "checkout", "2", "#1"]]) {
    expect(await runCodexEntry({ ...request, command }, deps)).toMatchObject({ ok: false, reason: expect.stringContaining("pilot requires no stored claims") });
  }
  expect(await Bun.file(join(pilot.dir, "docs/specs/checkout/phases/phase-2.md")).text()).toBe(phase);
});
