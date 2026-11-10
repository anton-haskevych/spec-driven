import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { Result } from "../core/result";
import { claudeSessionReader } from "../runtime/claude/sessions";
import { codexSessionReader } from "../runtime/codex/sessions";
import type { ReadOnlyRpc } from "../runtime/codex/transport";
import { readSessionSnapshot } from "../runtime/read-sessions";
import { liveSession } from "./factories";

const claude = { runtime: "claude", key: "fixture-home" } as const;
const codex = { runtime: "codex", key: "fixture-daemon" } as const;
const observedAt = "2026-11-09T04:00:00.000Z";
const fixture: { pages: Record<string, unknown>[]; threads: Record<string, unknown> } = await Bun.file(join(import.meta.dir, "fixtures/codex-read-only.json")).json();

function connection(options: { failPage?: boolean; throwRead?: boolean } = {}) {
  const calls: string[] = [];
  let page = 0;
  let closed = 0;
  const rpc: ReadOnlyRpc = {
    async request(method, params): Promise<Result<unknown>> {
      calls.push(method);
      if (options.throwRead) throw new Error("broken reader");
      if (method === "thread/loaded/list") {
        if (page > 0 && options.failPage) return { ok: false, reason: "lost second page" };
        return { ok: true, value: fixture.pages[page++] };
      }
      if (method === "thread/read") return { ok: true, value: fixture.threads[String(params.threadId)] };
      throw new Error(`unexpected write: ${method}`);
    },
    close: () => { closed++; },
  };
  return { connect: async () => ({ ok: true as const, value: rpc }), calls, closed: () => closed };
}

describe("source-bound session readers", () => {
  test("Claude reader keeps file/PID access injected and runs it once per snapshot", async () => {
    let loads = 0;
    const reader = claudeSessionReader(claude, () => { loads++; return { ok: true, value: [liveSession({ sessionId: "own", parkedJobId: "job" })] }; });
    const result = await readSessionSnapshot([reader], observedAt);
    expect(loads).toBe(1);
    expect(result).toMatchObject({ ok: true, value: { sessions: [{ ref: { source: claude, id: "own" }, continuation: { source: claude, id: "job" }, observedAt }] } });
  });

  test("Codex reader reuses pagination and closes its connection before returning", async () => {
    const harness = connection();
    const result = await readSessionSnapshot([codexSessionReader(codex, harness.connect)], observedAt);
    expect(result.ok && result.value.sessions.map((s) => s.ref.id)).toEqual(["other", "own"]);
    expect(result).toMatchObject({ ok: true, value: { coverage: [{ source: codex, state: "complete" }] } });
    expect(harness.calls).toEqual(["thread/loaded/list", "thread/read", "thread/loaded/list", "thread/read"]);
    expect(harness.closed()).toBe(1);
  });

  test("a failed page keeps prior native rows and healthy Claude coverage", async () => {
    const harness = connection({ failPage: true });
    const result = await readSessionSnapshot([
      claudeSessionReader(claude, () => ({ ok: true, value: [liveSession()] })), codexSessionReader(codex, harness.connect),
    ], observedAt);
    expect(result.ok && result.value.sessions).toHaveLength(2);
    expect(result).toMatchObject({ ok: true, value: { coverage: [
      { source: claude, state: "complete" }, { source: codex, state: "unavailable", reason: "lost second page" },
    ] } });
    expect(harness.closed()).toBe(1);
  });

  test("connection refusal is unavailable and thrown reads still close the connection", async () => {
    const refused = codexSessionReader(codex, async () => ({ ok: false, reason: "configured endpoint unavailable" }));
    expect(await readSessionSnapshot([refused], observedAt)).toEqual({ ok: true, value: {
      sessions: [], coverage: [{ source: codex, state: "unavailable", reason: "configured endpoint unavailable" }],
    } });
    const harness = connection({ throwRead: true });
    const result = await readSessionSnapshot([codexSessionReader(codex, harness.connect)], observedAt);
    expect(result).toMatchObject({ ok: true, value: { sessions: [], coverage: [{ source: codex, state: "unavailable" }] } });
    expect(harness.closed()).toBe(1);
  });

  test("unavailable Claude evidence preserves healthy Codex rows without certifying Claude absence", async () => {
    const harness = connection();
    const result = await readSessionSnapshot([
      claudeSessionReader(claude, () => ({ ok: false, reason: "unreadable session file" })),
      codexSessionReader(codex, harness.connect),
    ], observedAt);
    expect(result.ok && result.value.sessions.map((s) => s.ref.source)).toEqual([codex, codex]);
    expect(result).toMatchObject({ ok: true, value: { coverage: [
      { source: claude, state: "unavailable", reason: "unreadable session file" }, { source: codex, state: "complete" },
    ] } });
    expect(harness.closed()).toBe(1);
  });
});
