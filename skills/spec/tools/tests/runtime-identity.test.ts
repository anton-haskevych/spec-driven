import { describe, expect, test } from "bun:test";
import { sameSession, sameSource, sessionKey, sourceKey } from "../runtime/identity";
import { resolveIdentity } from "../runtime/resolve-identity";
import type { SessionRef, SourceRef } from "../runtime/sessions";
import { ownSessionId } from "../sessions/own";

const claude = { runtime: "claude", key: "local-home" } as const;
const codex = { runtime: "codex", key: "local-daemon" } as const;
const otherCodex = { runtime: "codex", key: "other-daemon" } as const;
const sources = [claude, codex];
const ref = (source: SourceRef, id = "same"): SessionRef => ({ source, id });

describe("source-qualified identity", () => {
  test("equality and keys distinguish runtime, source and native ID", () => {
    const refs = [ref(claude), ref(codex), ref(otherCodex), ref(codex, "different")];
    expect(new Set(refs.map(sessionKey)).size).toBe(4);
    for (const [i, first] of refs.entries()) {
      for (const [j, second] of refs.entries()) expect(sameSession(first, second)).toBe(i === j);
    }
    expect(sameSession(ref(codex), ref({ ...codex }))).toBe(true);
    expect(sameSource(codex, otherCodex)).toBe(false);
    expect(sourceKey(claude)).not.toBe(sourceKey({ ...claude, runtime: "codex" }));
  });

  test("opaque source keys and IDs cannot collide through delimiter joining", () => {
    expect(sessionKey(ref({ ...codex, key: "a:b" }, "c"))).not.toBe(sessionKey(ref({ ...codex, key: "a" }, "b:c")));
  });
});

describe("initiating runtime resolution", () => {
  test("resolves verified environment through an explicitly configured source", () => {
    expect(resolveIdentity({ sources, env: { CODEX_THREAD_ID: "native" } })).toEqual({ ok: true, value: ref(codex, "native") });
    expect(resolveIdentity({ sources, env: { CLAUDE_CODE_SESSION_ID: "legacy" } })).toEqual({ ok: true, value: ref(claude, "legacy") });
  });

  test("explicit host binding disambiguates source keys and works without shell evidence", () => {
    const binding = ref(otherCodex, "native");
    expect(resolveIdentity({ sources: [...sources, otherCodex], env: { CODEX_THREAD_ID: "native" }, binding })).toEqual({ ok: true, value: binding });
    expect(resolveIdentity({ sources, env: {}, binding: ref(codex) })).toEqual({ ok: true, value: ref(codex) });
  });

  test("missing, ambiguous and unconfigured evidence never fabricates an identity", () => {
    for (const request of [
      { sources, env: {} },
      { sources, env: { CODEX_SESSION_ID: "not-a-thread", CODEX_THREAD_ID: "" } },
      { sources: [claude], env: { CODEX_THREAD_ID: "native" } },
      { sources: [...sources, otherCodex], env: { CODEX_THREAD_ID: "native" } },
      { sources, env: {}, binding: ref(otherCodex) },
      { sources, env: {}, binding: ref(codex, "") },
      { sources, env: { CODEX_THREAD_ID: "   " } },
      { sources: [codex, { ...codex }], env: { CODEX_THREAD_ID: "native" } },
      { sources: [{ ...codex, key: "" }], env: { CODEX_THREAD_ID: "native" } },
    ]) expect(resolveIdentity(request)).toMatchObject({ ok: false, reason: expect.any(String) });
  });

  test("conflicting runtime or ID evidence refuses even with an explicit binding", () => {
    for (const env of [
      { CODEX_THREAD_ID: "native", CLAUDE_CODE_SESSION_ID: "legacy" },
      { CODEX_THREAD_ID: "different" },
      { CLAUDE_CODE_SESSION_ID: "same" },
    ]) expect(resolveIdentity({ sources, env, binding: ref(codex) })).toMatchObject({ ok: false });
  });

  test("the explicit legacy Claude API retains its original decoding", () => {
    expect(ownSessionId({ CODEX_THREAD_ID: "native" })).toBeUndefined();
    expect(ownSessionId({ CODEX_THREAD_ID: "native", CLAUDE_CODE_SESSION_ID: "legacy" })).toBe("legacy");
  });
});
