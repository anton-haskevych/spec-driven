import { afterAll, expect, test } from "bun:test";
import { runtimeContextPack, type RuntimeContextDeps } from "../commands/runtime-context";
import { claudeSessionReader } from "../runtime/claude/sessions";
import { codexSessionReader } from "../runtime/codex/sessions";
import { createContextFixture } from "./context-fixture";
import { liveSession } from "./factories";
import { stubRunner } from "./stub-runner";

const fixture = createContextFixture();
afterAll(fixture.cleanup);
const claude = { runtime: "claude", key: "configured-home" } as const;
const codex = { runtime: "codex", key: "configured-daemon" } as const;

function dependencies() {
  const calls = { claude: 0, codex: 0, claims: 0, now: 0 };
  const deps: RuntimeContextDeps = {
    env: { CODEX_THREAD_ID: "same" }, runner: stubRunner([]), readClaimsHere: () => [],
    now: () => { calls.now++; return "2026-11-09T10:00:00Z"; },
    readers: [
      claudeSessionReader(claude, () => { calls.claude++; return { ok: true, value: [liveSession({ sessionId: "same" })] }; }),
      codexSessionReader(codex, async () => { calls.codex++; return { ok: false, reason: "fixture daemon offline" }; }),
    ],
    readClaims: () => { calls.claims++; return { ok: true, value: [
      { spec: "checkout", phase: "2", ref: { source: claude, id: "same" }, sessionName: "Claude worker" },
      { spec: "checkout", phase: "3", ref: { source: codex, id: "unknown" }, sessionName: "Codex worker" },
    ] }; },
  };
  return { deps, calls };
}

test("configured runtime context reuses one source snapshot for shared phase selection", async () => {
  fixture.write("progress.md", "- [ ] Phase 2 — Aggregate → `phases/phase-2.md`\n- [ ] Phase 3 — Views → `phases/phase-3.md`\n- [ ] Phase 4 — Next → `phases/phase-4.md`\n");
  for (const id of ["2", "3", "4"]) fixture.write(`phases/phase-${id}.md`, "---\nneeds: []\n---\n- [ ] work\n");
  const { deps, calls } = dependencies();
  const result = await runtimeContextPack(fixture.project, { mode: "execute", name: "checkout" }, deps);
  expect(result.ok && result.value).toContain("Picked: Phase 4");
  expect(result.ok && result.value).toContain("2 (in flight: Claude worker), 3 (in flight: Codex worker)");
  expect(calls).toEqual({ claude: 1, codex: 1, claims: 1, now: 1 });
});

test("conflicting or ambiguous identity refuses before reading sessions or claims", async () => {
  const { deps, calls } = dependencies();
  deps.env = { CLAUDE_CODE_SESSION_ID: "same", CODEX_THREAD_ID: "same" };
  expect(await runtimeContextPack(fixture.project, { mode: "execute", name: "checkout" }, deps)).toEqual({ ok: false, reason: "conflicting Claude and Codex runtime identity evidence" });
  deps.env = { CODEX_THREAD_ID: "same" };
  deps.readers = [...deps.readers, codexSessionReader({ runtime: "codex", key: "second" }, async () => { throw new Error("must not connect"); })];
  expect(await runtimeContextPack(fixture.project, { mode: "execute", name: "checkout" }, deps)).toEqual({ ok: false, reason: "runtime identity requires one configured source or an explicit host binding" });
  expect(calls).toEqual({ claude: 0, codex: 0, claims: 0, now: 0 });
});

test("qualified self-exclusion and complete absence make a phase selectable", async () => {
  const { deps, calls } = dependencies();
  deps.readClaims = () => ({ ok: true, value: [
    { spec: "checkout", phase: "2", ref: { source: codex, id: "same" } },
    { spec: "checkout", phase: "3", ref: { source: claude, id: "gone" } },
  ] });
  const result = await runtimeContextPack(fixture.project, { mode: "execute", name: "checkout" }, deps);
  expect(result.ok && result.value).toContain("Picked: Phase 2");
  expect(result.ok && result.value).not.toContain("skipped 2");
  expect(calls.claude).toBe(1);
  expect(calls.codex).toBe(1);
});

test("a claim-reader failure returns its reason before opening any session source", async () => {
  const { deps, calls } = dependencies();
  deps.readClaims = async () => ({ ok: false, reason: "qualified claim data unavailable" });
  expect(await runtimeContextPack(fixture.project, { mode: "execute", name: "checkout" }, deps)).toEqual({ ok: false, reason: "qualified claim data unavailable" });
  expect(calls).toEqual({ claude: 0, codex: 0, claims: 0, now: 0 });
});

test("an explicit host binding selects one of several configured native sources", async () => {
  const { deps, calls } = dependencies();
  let secondReads = 0;
  deps.binding = { source: codex, id: "same" };
  deps.readers = [...deps.readers, codexSessionReader({ runtime: "codex", key: "second" }, async () => {
    secondReads++;
    return { ok: false, reason: "other configured source offline" };
  })];
  const result = await runtimeContextPack(fixture.project, { mode: "execute", name: "checkout" }, deps);
  expect(result.ok && result.value).toContain("Picked: Phase 4");
  expect(calls).toEqual({ claude: 1, codex: 1, claims: 1, now: 1 });
  expect(secondReads).toBe(1);
});
