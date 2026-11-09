import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createStoredRuntimeContextCommand } from "../commands/stored-runtime-context";
import { claudeSessionReader } from "../runtime/claude/sessions";
import { codexSessionReader } from "../runtime/codex/sessions";
import type { CodexSource } from "../runtime/sessions";
import { run } from "../spec";
import { createContextFixture } from "./context-fixture";
import { claim, liveSession } from "./factories";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const claude = { runtime: "claude", key: "fixture-home" } as const;
const codex = { runtime: "codex", key: "fixture-daemon" } as const;
let repo: TestRepo;
let reads: { claude: number; codex: number; storage: number };
let claimsDir: string;

beforeEach(() => {
  repo = repoWithOrigin("stored-context-");
  const fixture = createContextFixture();
  fixture.write("progress.md", "- [ ] Phase 2 — Busy → `phases/phase-2.md`\n- [ ] Phase 3 — Unknown → `phases/phase-3.md`\n- [ ] Phase 4 — Free → `phases/phase-4.md`\n");
  for (const id of ["2", "3", "4"]) fixture.write(`phases/phase-${id}.md`, "---\nneeds: []\n---\n- [ ] work\n");
  cpSync(join(fixture.project, "docs"), join(repo.dir, "docs"), { recursive: true });
  fixture.cleanup();
  claimsDir = join(repo.dir, ".git", "spec-board", "claims");
  mkdirSync(claimsDir, { recursive: true });
  reads = { claude: 0, codex: 0, storage: 0 };
});
afterEach(() => repo?.cleanup());

function command(legacySource: typeof claude | undefined) {
  return createStoredRuntimeContextCommand({
    env: { CODEX_THREAD_ID: "same" }, now: () => "2026-11-09T12:00:00Z", legacySource,
    runner: { run(argv, options) {
      if (argv.includes("--git-common-dir")) reads.storage++;
      return isolatedRunner.run(argv, options);
    } },
    readers: [
      claudeSessionReader(claude, () => { reads.claude++; return { ok: true, value: [liveSession({ sessionId: "same" })] }; }),
      codexSessionReader(codex, async () => { reads.codex++; return { ok: false, reason: "fixture source offline" }; }),
    ],
  });
}

function writeClaim(phase: string, source: CodexSource = codex, id = "other", workspace = "/other-tree") {
  const text = JSON.stringify({ schemaVersion: 1, spec: "checkout", phase,
    ref: { source, id }, workspace, claimedAt: "now", sessionName: `Worker ${phase}` });
  writeFileSync(join(claimsDir, `checkout#${phase}.json`), text);
  return text;
}

test("the configured dispatcher uses disk claims and one source snapshot to skip held phases", async () => {
  writeFileSync(join(claimsDir, "checkout#2.json"), JSON.stringify(claim({ spec: "checkout", phase: "2", sessionId: "same" })));
  const text = writeClaim("3");
  const output = await run(["context", "execute", "checkout"], repo.dir, { context: command(claude) });
  expect(output).toContain("Picked: Phase 4");
  expect(output).toContain("3 (in flight: Worker 3)");
  expect(reads).toEqual({ claude: 1, codex: 1, storage: 1 });
  expect(readFileSync(join(claimsDir, "checkout#3.json"), "utf8")).toBe(text);
});

test("no-name inference uses the same qualified disk rows and resolves a linked worktree", async () => {
  repo.commitAll("spec fixture");
  const tree = repo.addWorktree("worker", "feat/worker");
  const workspace = realpathSync(tree.dir);
  writeClaim("2", codex, "same", workspace);
  const output = await run(["context", "execute"], tree.dir, { context: command(claude) });
  expect(output).toContain('<spec-pack spec="checkout" mode="execute" inferred="true">');
  expect(output).toContain("this tree's claim on phase 2");
  expect(output).toContain("Picked: Phase 2");
  expect(reads).toEqual({ claude: 1, codex: 1, storage: 1 });
});

test("an unknown version refuses before opening session sources or rendering free work", async () => {
  writeFileSync(join(claimsDir, "checkout#2.json"), JSON.stringify({ ...claim({ spec: "checkout", phase: "2" }), schemaVersion: 99 }));
  const output = await run(["context", "execute", "checkout"], repo.dir, { context: command(claude) });
  expect(output).toContain("context: claim checkout#2.json: unsupported claim schema version");
  expect(output).not.toContain("Picked:");
  expect(reads).toEqual({ claude: 0, codex: 0, storage: 1 });
});

test("a missing explicit legacy binding cannot be inferred from configured readers", async () => {
  writeFileSync(join(claimsDir, "checkout#2.json"), JSON.stringify(claim({ spec: "checkout", phase: "2" })));
  expect(await run(["context", "execute", "checkout"], repo.dir, { context: command(undefined) })).toContain("explicit legacy Claude source");
  expect(reads.claude + reads.codex).toBe(0);
});

test("a stored claim from an unconfigured source stays held even when its native ID equals self", async () => {
  writeClaim("2", { runtime: "codex", key: "other-daemon" }, "same");
  const configured = createStoredRuntimeContextCommand({
    env: { CODEX_THREAD_ID: "same" }, runner: isolatedRunner, now: () => "now",
    readers: [{ source: codex, read: async () => ({ sessions: [], coverage: [{ source: codex, state: "complete" }] }) }],
  });
  const output = await run(["context", "execute", "checkout"], repo.dir, { context: configured });
  expect(output).toContain("Picked: Phase 3");
  expect(output).toContain("2 (in flight: Worker 2)");
});

test("identity conflicts refuse before filesystem/Git or source access", async () => {
  const configured = createStoredRuntimeContextCommand({
    env: { CODEX_THREAD_ID: "same", CLAUDE_CODE_SESSION_ID: "same" }, now: () => "now",
    runner: { run() { throw new Error("must not access Git"); } },
    readers: [{ source: codex, read: async () => { throw new Error("must not read source"); } }],
  });
  expect(await run(["context", "execute", "checkout"], repo.dir, { context: configured }))
    .toBe("context: conflicting Claude and Codex runtime identity evidence");
});
